# Open PDF Library

**Knowledge Should Be Open to Everyone.**

A minimalist, production-ready digital library for discovering, reading, and downloading PDFs. Designed for static hosting on **GitHub Pages** — no backend required.

---

## Features

- Clean, responsive interface (phones, tablets, desktops)
- Client-side search and filtering (title, author, category, language)
- In-browser PDF reader powered by PDF.js
- Download links for offline reading
- Featured and recently-added sections
- Category browsing driven by real book data
- Library statistics calculated from `books.json`
- Professional disclaimer, about, and privacy pages
- Visitor counter integration
- Easy book management via a single JSON file

---

## Quick start (GitHub Pages)

1. **Create a new repository** on GitHub (e.g. `open-pdf-library`).
2. **Upload all files** from this project to the repository root (or a `docs/` folder if you prefer).
3. **Enable GitHub Pages**
   - Go to **Settings → Pages**
   - Source: Deploy from a branch
   - Branch: `main` (or `master`), folder: `/ (root)` or `/docs`
4. Wait a minute or two, then open:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

No build step is required. The site is plain HTML, CSS, and JavaScript.

---

## Project structure

```
open-pdf-library/
├── index.html          # Homepage
├── about.html
├── disclaimer.html
├── privacy.html
├── 404.html
├── style.css
├── script.js
├── books.json          # ← All book metadata lives here
├── assets/
│   ├── logo.svg
│   ├── covers/         # Optional cover images
│   └── icons/
├── books/              # Optional locally hosted PDFs
│   └── README.md
└── README.md
```

---

## How to add a book

You manage the library yourself by editing files. There is no upload dashboard (GitHub Pages is static).

### Step 1 — Prepare the PDF

- Prefer **public-domain**, **open-licensed**, or otherwise **redistributable** works.
- Either:
  - Place the PDF in the `books/` folder, **or**
  - Host it elsewhere and use the full URL.

### Step 2 — Optional cover image

- Place a cover image in `assets/covers/` (e.g. `my-book.jpg`).
- Recommended size: roughly 400×600 px or similar aspect ratio.
- If you omit the cover, the site shows a clean typographic placeholder.

### Step 3 — Add metadata to `books.json`

Open `books.json` and append a new object (keep valid JSON — commas matter):

```json
{
  "id": "book-011",
  "title": "Your Book Title",
  "author": "Author Name",
  "category": "Science",
  "language": "English",
  "description": "A short description.",
  "cover": "assets/covers/your-book.jpg",
  "pdf": "books/your-book.pdf",
  "fileSize": "2.1 MB",
  "dateAdded": "2026-10-10",
  "featured": false,
  "license": "Public domain",
  "source": "Project Gutenberg"
}
```

| Field        | Required | Notes                                      |
|--------------|----------|--------------------------------------------|
| `id`         | Yes      | Unique string (e.g. `book-011`)            |
| `title`      | Yes      | Book title                                 |
| `author`     | No       | Author name                                |
| `category`   | No       | Used for filters and chips                 |
| `language`   | No       | Used for filters                           |
| `description`| No       | Short summary                              |
| `cover`      | No       | Relative path to image                     |
| `pdf`        | Yes      | Relative path **or** full external URL     |
| `fileSize`   | No       | Display only                               |
| `dateAdded`  | Yes      | ISO date `YYYY-MM-DD` (for sorting)        |
| `featured`   | No       | `true` to show in Featured section         |
| `license`    | No       | e.g. Public domain, CC BY, etc.            |
| `source`     | No       | Attribution source                         |

### Step 4 — Commit and push

```bash
git add books.json books/ assets/covers/
git commit -m "Add: Your Book Title"
git push
```

### Step 5 — Wait for GitHub Pages

GitHub usually rebuilds the site within 1–2 minutes. Refresh your live URL. The new book appears automatically — no changes to `script.js` are needed.

---

## PDF reader notes

- The reader uses **PDF.js** (loaded from a CDN).
- **Locally hosted PDFs** (same origin) generally work best.
- **External PDFs** may fail to load in the browser due to CORS or host restrictions. In that case the reader shows a clear error and the Download button remains available.
- Do not attempt to bypass access restrictions of external hosts.

---

## Customization

- **Accent color**: edit `--accent` and `--accent-hover` in `style.css`.
- **Contact / copyright email**: update the contact section in `disclaimer.html`.
- **Site name / tagline**: change in HTML files and the footer.
- **Visitor counter**: the FreeVisitorCounters scripts are already included. Replace only if you register a new counter of your own.

---

## Storage limits

GitHub repositories have practical limits on file size and bandwidth. For large collections:

1. Host PDFs on a suitable external service that permits redistribution.
2. Put the full URL in the `pdf` field of `books.json`.
3. Keep only metadata and small cover images in the repo if needed.

---

## License of this website code

You may use, modify, and deploy this website code for your own library project.  
Individual books remain subject to their own copyright and license terms.

---

## Support

For copyright complaints or technical issues related to *your* deployment, use the contact method you configure on the Disclaimer page.
