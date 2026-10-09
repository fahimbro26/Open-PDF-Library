/**
 * Open PDF Library — Client-side logic
 * Static GitHub Pages compatible
 */

(function () {
  'use strict';

  // Base path detection for GitHub Pages subdirectory support
  // Works at domain root or under /repo-name/
  const BASE = (function () {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('script.js') !== -1) {
        try {
          const url = new URL(src, window.location.href);
          const path = url.pathname.replace(/\/script\.js$/, '/');
          return path || '/';
        } catch (e) {}
      }
    }
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    if (parts.length && parts[parts.length - 1].endsWith('.html')) {
      parts.pop();
    }
    return parts.length ? '/' + parts.join('/') + '/' : '/';
  })();

  // State
  let books = [];
  let filteredBooks = [];
  let currentSort = 'newest';
  let currentCategory = '';
  let currentLanguage = '';
  let searchQuery = '';

  // PDF.js state
  let pdfDoc = null;
  let pageNum = 1;
  let pageRendering = false;
  let pageNumPending = null;
  let scale = 1.2;
  const canvas = () => document.getElementById('pdf-canvas');
  const ctx = () => canvas() ? canvas().getContext('2d') : null;

  // ---------- Utilities ----------
  function $(sel, root = document) {
    return root.querySelector(sel);
  }
  function $$(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  }

  // ---------- Load books ----------
  async function loadBooks() {
    try {
      const res = await fetch(BASE + 'books.json');
      if (!res.ok) throw new Error('Failed to load library data');
      books = await res.json();
      if (!Array.isArray(books)) throw new Error('Invalid library data');
      applyFilters();
      updateStats();
      renderCategories();
      return true;
    } catch (err) {
      console.error(err);
      const grid = $('#book-grid') || $('#featured-grid') || $('#recent-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <p>Unable to load the library. Please try again later.</p>
          </div>`;
      }
      return false;
    }
  }

  // ---------- Filtering & Sorting ----------
  function applyFilters() {
    filteredBooks = books.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.language && b.language.toLowerCase().includes(q)) ||
        (b.description && b.description.toLowerCase().includes(q));
      const matchCat = !currentCategory || b.category === currentCategory;
      const matchLang = !currentLanguage || b.language === currentLanguage;
      return matchQ && matchCat && matchLang;
    });

    if (currentSort === 'newest') {
      filteredBooks.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || ''));
    } else if (currentSort === 'title') {
      filteredBooks.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (currentSort === 'author') {
      filteredBooks.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    }

    renderBookGrids();
  }

  function updateStats() {
    const totalEl = $('#stat-books');
    const catEl = $('#stat-categories');
    const langEl = $('#stat-languages');
    if (totalEl) totalEl.textContent = books.length;
    if (catEl) {
      const cats = new Set(books.map((b) => b.category).filter(Boolean));
      catEl.textContent = cats.size;
    }
    if (langEl) {
      const langs = new Set(books.map((b) => b.language).filter(Boolean));
      langEl.textContent = langs.size;
    }
  }

  function renderCategories() {
    const container = $('#category-list');
    if (!container) return;
    const cats = [...new Set(books.map((b) => b.category).filter(Boolean))].sort();
    container.innerHTML = cats
      .map(
        (c) =>
          `<button type="button" class="category-chip${currentCategory === c ? ' active' : ''}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
      )
      .join('');
    container.querySelectorAll('.category-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.category === currentCategory ? '' : btn.dataset.category;
        // Update URL hash for browse
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
          // stay
        }
        applyFilters();
        // Scroll to books if on homepage
        const grid = $('#book-grid') || $('#recent-grid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderCategories();
      });
    });
  }

  // ---------- Book card rendering ----------
  function createBookCard(book) {
    const coverHtml = book.cover
      ? `<img src="${escapeHtml(BASE + book.cover)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy" onerror="this.parentElement.innerHTML=this.parentElement.dataset.placeholder">`
      : '';
    const placeholder = `
      <div class="book-cover-placeholder">
        <span class="ph-title">${escapeHtml(book.title)}</span>
        <span class="ph-author">${escapeHtml(book.author || '')}</span>
      </div>`;

    return `
      <article class="book-card" data-id="${escapeHtml(book.id)}">
        <div class="book-cover" data-placeholder="${escapeHtml(placeholder.replace(/"/g, '&quot;'))}">
          ${coverHtml || placeholder}
        </div>
        <div class="book-info">
          <h3 class="book-title">${escapeHtml(book.title)}</h3>
          <p class="book-author">${escapeHtml(book.author || 'Unknown author')}</p>
          <div class="book-meta">
            ${book.category ? `<span>${escapeHtml(book.category)}</span>` : ''}
            ${book.language ? `<span>${escapeHtml(book.language)}</span>` : ''}
            ${book.fileSize ? `<span>${escapeHtml(book.fileSize)}</span>` : ''}
            <span>PDF</span>
          </div>
          <div class="book-actions">
            <button type="button" class="btn btn-primary btn-sm btn-read" data-id="${escapeHtml(book.id)}">Read Online</button>
            <a class="btn btn-secondary btn-sm" href="${escapeHtml(book.pdf)}" download target="_blank" rel="noopener" data-download="${escapeHtml(book.id)}">Download</a>
          </div>
        </div>
      </article>`;
  }

  function renderBookGrids() {
    // Featured
    const featuredGrid = $('#featured-grid');
    if (featuredGrid) {
      const featured = books.filter((b) => b.featured).slice(0, 8);
      featuredGrid.innerHTML =
        featured.length > 0
          ? featured.map(createBookCard).join('')
          : '<div class="empty-state" style="grid-column:1/-1"><p>No featured books yet.</p></div>';
      bindCardActions(featuredGrid);
    }

    // Recent / main grid
    const recentGrid = $('#recent-grid');
    if (recentGrid) {
      const recent = [...books].sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')).slice(0, 8);
      recentGrid.innerHTML =
        recent.length > 0
          ? recent.map(createBookCard).join('')
          : '<div class="empty-state" style="grid-column:1/-1"><p>No books yet.</p></div>';
      bindCardActions(recentGrid);
    }

    // Full browse grid
    const bookGrid = $('#book-grid');
    if (bookGrid) {
      if (filteredBooks.length === 0) {
        bookGrid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <p>No books match your search or filters.</p>
            <button type="button" class="btn btn-secondary btn-sm" id="clear-filters">Clear filters</button>
          </div>`;
        const clearBtn = $('#clear-filters');
        if (clearBtn) clearBtn.addEventListener('click', clearAllFilters);
      } else {
        bookGrid.innerHTML = filteredBooks.map(createBookCard).join('');
        bindCardActions(bookGrid);
      }
    }
  }

  function bindCardActions(container) {
    container.querySelectorAll('.btn-read').forEach((btn) => {
      btn.addEventListener('click', () => openReader(btn.dataset.id));
    });
  }

  function clearAllFilters() {
    searchQuery = '';
    currentCategory = '';
    currentLanguage = '';
    currentSort = 'newest';
    const searchInputs = $$('input[type="search"], #search-input, #hero-search, #filter-search');
    searchInputs.forEach((i) => (i.value = ''));
    const catSelect = $('#filter-category');
    if (catSelect) catSelect.value = '';
    const langSelect = $('#filter-language');
    if (langSelect) langSelect.value = '';
    const sortSelect = $('#filter-sort');
    if (sortSelect) sortSelect.value = 'newest';
    applyFilters();
    renderCategories();
  }

  // ---------- PDF Reader (PDF.js) ----------
  function openReader(bookId) {
    const book = books.find((b) => b.id === bookId);
    if (!book || !book.pdf) {
      alert('This book is currently unavailable.');
      return;
    }

    const overlay = $('#reader-overlay');
    if (!overlay) return;

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const titleEl = $('#reader-title');
    if (titleEl) titleEl.textContent = book.title || 'Reading…';

    const downloadBtn = $('#reader-download');
    if (downloadBtn) {
      downloadBtn.href = book.pdf;
      downloadBtn.setAttribute('download', (book.title || 'book').replace(/[^\w\s-]/g, '') + '.pdf');
    }

    // Reset
    pageNum = 1;
    scale = window.innerWidth < 600 ? 0.9 : 1.2;
    pdfDoc = null;

    const loading = $('#reader-loading');
    const errorEl = $('#reader-error');
    if (loading) loading.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');

    // Load PDF
    if (typeof pdfjsLib === 'undefined') {
      showReaderError('PDF viewer library failed to load. Please try downloading the file instead.');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjsLib.getDocument({
      url: book.pdf,
      withCredentials: false,
    });

    loadingTask.promise
      .then((pdf) => {
        pdfDoc = pdf;
        if (loading) loading.classList.add('hidden');
        updatePageInfo();
        renderPage(pageNum);
      })
      .catch((err) => {
        console.error('PDF load error:', err);
        showReaderError(
          'Unable to load this PDF in the browser. This may be due to access restrictions from the host. Please try the Download button instead.'
        );
      });
  }

  function showReaderError(msg) {
    const loading = $('#reader-loading');
    const errorEl = $('#reader-error');
    if (loading) loading.classList.add('hidden');
    if (errorEl) {
      errorEl.classList.remove('hidden');
      const p = errorEl.querySelector('p');
      if (p) p.textContent = msg;
    }
  }

  function renderPage(num) {
    if (!pdfDoc) return;
    pageRendering = true;

    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale });
      const c = canvas();
      if (!c) return;
      c.height = viewport.height;
      c.width = viewport.width;

      const renderContext = {
        canvasContext: ctx(),
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        pageRendering = false;
        if (pageNumPending !== null) {
          renderPage(pageNumPending);
          pageNumPending = null;
        }
        updatePageInfo();
      });
    });
  }

  function queueRenderPage(num) {
    if (pageRendering) {
      pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function updatePageInfo() {
    const info = $('#reader-page-info');
    if (info && pdfDoc) {
      info.textContent = `${pageNum} / ${pdfDoc.numPages}`;
    }
    const prev = $('#reader-prev');
    const next = $('#reader-next');
    if (prev) prev.disabled = pageNum <= 1;
    if (next) next.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
  }

  function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  }

  function onNextPage() {
    if (!pdfDoc || pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  }

  function onZoomIn() {
    scale = Math.min(scale + 0.25, 3);
    queueRenderPage(pageNum);
  }

  function onZoomOut() {
    scale = Math.max(scale - 0.25, 0.5);
    queueRenderPage(pageNum);
  }

  function onFitWidth() {
    if (!pdfDoc || !canvas()) return;
    pdfDoc.getPage(pageNum).then((page) => {
      const container = $('#reader-canvas-wrap');
      if (!container) return;
      const avail = container.clientWidth - 32;
      const viewport = page.getViewport({ scale: 1 });
      scale = avail / viewport.width;
      queueRenderPage(pageNum);
    });
  }

  function closeReader() {
    const overlay = $('#reader-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
    pdfDoc = null;
    if (canvas()) {
      const c = canvas();
      c.width = 0;
      c.height = 0;
    }
  }

  function toggleFullscreen() {
    const overlay = $('#reader-overlay');
    if (!overlay) return;
    if (!document.fullscreenElement) {
      overlay.requestFullscreen?.() || overlay.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  // ---------- Navigation & UI ----------
  function initNav() {
    const menuToggle = $('#menu-toggle');
    const navMobile = $('#nav-mobile');
    const searchToggle = $('#search-toggle');
    const searchBar = $('#search-bar');

    if (menuToggle && navMobile) {
      menuToggle.addEventListener('click', () => {
        navMobile.classList.toggle('open');
        searchBar?.classList.remove('open');
      });
    }

    if (searchToggle && searchBar) {
      searchToggle.addEventListener('click', () => {
        searchBar.classList.toggle('open');
        navMobile?.classList.remove('open');
        if (searchBar.classList.contains('open')) {
          const input = searchBar.querySelector('input');
          if (input) input.focus();
        }
      });
    }

    // Close mobile nav on link click
    $$('#nav-mobile a').forEach((a) => {
      a.addEventListener('click', () => navMobile?.classList.remove('open'));
    });
  }

  function initSearch() {
    // Hero search
    const heroForm = $('#hero-search-form');
    if (heroForm) {
      heroForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('#hero-search');
        if (input) {
          searchQuery = input.value;
          // Navigate to browse section or page
          const browse = $('#browse') || $('#book-grid');
          if (browse) {
            applyFilters();
            browse.scrollIntoView({ behavior: 'smooth' });
          } else {
            window.location.href = BASE + 'index.html#browse';
          }
        }
      });
    }

    // Desktop header search
    const desktopSearch = $('#desktop-search-form');
    if (desktopSearch) {
      desktopSearch.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = desktopSearch.querySelector('input');
        if (input) {
          searchQuery = input.value;
          applyFilters();
          const grid = $('#book-grid') || $('#recent-grid');
          if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Mobile search bar
    const mobileSearch = $('#mobile-search-form');
    if (mobileSearch) {
      mobileSearch.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = mobileSearch.querySelector('input');
        if (input) {
          searchQuery = input.value;
          applyFilters();
          $('#search-bar')?.classList.remove('open');
          const grid = $('#book-grid') || $('#recent-grid');
          if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Filter bar on browse
    const filterSearch = $('#filter-search');
    if (filterSearch) {
      let debounce;
      filterSearch.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          searchQuery = filterSearch.value;
          applyFilters();
        }, 250);
      });
    }

    const filterCat = $('#filter-category');
    if (filterCat) {
      filterCat.addEventListener('change', () => {
        currentCategory = filterCat.value;
        applyFilters();
        renderCategories();
      });
    }

    const filterLang = $('#filter-language');
    if (filterLang) {
      filterLang.addEventListener('change', () => {
        currentLanguage = filterLang.value;
        applyFilters();
      });
    }

    const filterSort = $('#filter-sort');
    if (filterSort) {
      filterSort.addEventListener('change', () => {
        currentSort = filterSort.value;
        applyFilters();
      });
    }

    const clearBtn = $('#clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllFilters);
    }
  }

  function populateFilterSelects() {
    const catSelect = $('#filter-category');
    if (catSelect) {
      const cats = [...new Set(books.map((b) => b.category).filter(Boolean))].sort();
      catSelect.innerHTML =
        '<option value="">All categories</option>' +
        cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }
    const langSelect = $('#filter-language');
    if (langSelect) {
      const langs = [...new Set(books.map((b) => b.language).filter(Boolean))].sort();
      langSelect.innerHTML =
        '<option value="">All languages</option>' +
        langs.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
    }
  }

  function initReaderControls() {
    $('#reader-prev')?.addEventListener('click', onPrevPage);
    $('#reader-next')?.addEventListener('click', onNextPage);
    $('#reader-zoom-in')?.addEventListener('click', onZoomIn);
    $('#reader-zoom-out')?.addEventListener('click', onZoomOut);
    $('#reader-fit')?.addEventListener('click', onFitWidth);
    $('#reader-fullscreen')?.addEventListener('click', toggleFullscreen);
    $('#reader-close')?.addEventListener('click', closeReader);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!$('#reader-overlay')?.classList.contains('open')) return;
      if (e.key === 'Escape') closeReader();
      if (e.key === 'ArrowLeft') onPrevPage();
      if (e.key === 'ArrowRight') onNextPage();
    });
  }

  // ---------- Init ----------
  async function init() {
    initNav();
    initReaderControls();

    const ok = await loadBooks();
    if (ok) {
      populateFilterSelects();
      initSearch();

      // Handle hash
      if (window.location.hash === '#browse') {
        const el = $('#browse') || $('#book-grid');
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
