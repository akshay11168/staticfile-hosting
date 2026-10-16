# Static PDF Hosting (GitHub Pages)

Host PDFs behind stable URLs and static QR codes. Scan a QR → the PDF opens in the browser. No login and no backend.

The site root is a QR generator: type any text, and the code is drawn in the browser. Nothing is uploaded.

**Production domain:** https://static-hosting.biradarakshay.com

Tooling (QR generation, sample PDFs, PDF router) is written in **TypeScript**. The published site remains static HTML/CSS/JS only.

## How it works

```
PDF in events/
  → stable URL /event/<event>/<doc>
  → static QR code
  → user scans
  → PDF opens in the browser viewer
```

Adding a PDF is enough to make the URL work. No app code changes.

| URL | File |
|-----|------|
| `/event/wedding/1` | `events/wedding/1.pdf` |
| `/event/conference-2026/2` | `events/conference-2026/2.pdf` |

QR codes always point at the **logical** URL (`/event/...`), never at `/events/....pdf`. Replace the PDF file anytime; reprinting QR codes is not required.

## Repository structure

```
events/
├── wedding/
│   ├── 1.pdf
│   └── 2.pdf
└── conference-2026/
    └── 1.pdf

qr/
└── wedding/
    ├── 1.svg
    ├── 1.png
    ├── 2.svg
    └── 2.png

src/download.ts       # TypeScript source for the PDF router
src/qr-page.ts        # TypeScript source for the browser QR generator
assets/download.js    # compiled PDF router (commit after npm run build)
assets/qr.js          # bundled QR generator (commit after npm run build)
404.html              # routes /event/<event>/<doc> → open PDF in browser
index.html            # site root: type any text, get a QR code
CNAME                 # custom domain
.nojekyll             # serve files as plain static assets
scripts/
├── generate-qr.ts
└── create-sample-pdfs.ts
```

## Setup (tooling)

```bash
npm install
npm run build          # compiles src/download.ts → assets/download.js
npm run generate-qr    # scans events/ and writes qr/
```

## Add a new event

1. Create a folder: `events/<event-name>/`
2. Add PDFs: `events/<event-name>/1.pdf`, `2.pdf`, …
3. Commit and push to GitHub
4. URLs are live after GitHub Pages publishes:
   - `https://static-hosting.biradarakshay.com/event/<event-name>/1`
5. Generate QR codes (optional, for printing):

```bash
npm run generate-qr
```

Event names become URL path segments. Prefer lowercase letters, numbers, and hyphens (e.g. `birthday-party`).

## Add PDFs to an existing event

Drop another file into the event folder:

```text
events/wedding/7.pdf
```

After push, this URL works:

```text
https://static-hosting.biradarakshay.com/event/wedding/7
```

Then regenerate QR codes if you need a printable code for document `7`.

## URL mapping

- Pattern: `/event/<event-name>/<document-name>`
- File: `events/<event-name>/<document-name>.pdf`
- `<event-name>` is the folder name (not hardcoded in code)
- `<document-name>` is the PDF filename without `.pdf`

The router is `404.html` + `assets/download.js` (from `src/download.ts`). GitHub Pages serves `404.html` for any path that is not a real file, including `/event/...`. The script maps that path to the PDF under `/events/...` and navigates to it so the browser’s built-in PDF viewer displays the file.

## Generate QR codes

```bash
npm install
npm run generate-qr
```

Options:

```bash
# Only one event
npm run generate-qr -- --event wedding

# Local or staging origin
npm run generate-qr -- --base-url http://127.0.0.1:5500
```

Output (high error correction, quiet zone, print-friendly PNG):

```text
qr/<event-name>/<document-name>.svg
qr/<event-name>/<document-name>.png
```

QR codes are generated offline with the `qrcode` package. No third-party QR SaaS.

## QR generator on the site root

Open the site root and type any text or link. The page encodes it in the browser and shows a QR code. Download PNG or SVG from the page. There is no server, account, or stored history.

The text is kept in the page address (`#...`) so a refresh restores it. That fragment never leaves the browser.

## Replace a PDF without changing its QR

Overwrite the same path:

```text
events/wedding/1.pdf   ← replace this file
```

Keep the filename. The QR for `/event/wedding/1` stays valid.

## Configure GitHub Pages

1. Push this repository to GitHub
2. **Settings → Pages**
3. Source: **Deploy from a branch**
4. Branch: `main` (or `master`), folder: `/ (root)`
5. Save and wait for the deployment

Confirm the site loads on `https://<user>.github.io/<repo>/` before attaching the custom domain (optional check).

## Configure the custom domain

1. This repo includes a `CNAME` file with:

   ```text
   static-hosting.biradarakshay.com
   ```

2. In your DNS provider, create a **CNAME** record:

   | Host | Type | Value |
   |------|------|--------|
   | `static-hosting` | CNAME | `<user>.github.io` |

3. In **Settings → Pages → Custom domain**, enter `static-hosting.biradarakshay.com` and enable **DNS check** / HTTPS

4. Final QR URLs:

   ```text
   https://static-hosting.biradarakshay.com/event/<event-name>/<document-name>
   ```

## Test QR codes (Android / iOS)

1. Prefer testing against the **custom domain** HTTPS URL (same as printed codes)
2. Android: Camera / Google Lens → should open the URL → PDF viewer
3. iOS: Camera → notification banner → Safari opens the URL → PDF opens in viewer
4. Confirm the opened file matches the intended PDF
5. Replace a PDF, hard-refresh or wait for Pages CDN, scan again — same QR, new content

Local check without DNS:

```bash
npm run build
python3 -m http.server 8080
# Open http://127.0.0.1:8080/event/wedding/1
```

For local QR tests, regenerate with `--base-url http://127.0.0.1:8080`.

## Browser PDF viewing

- Desktop Chrome/Firefox/Safari/Edge: navigating to the `.pdf` URL usually opens the built-in PDF viewer
- iOS Safari and Android Chrome: same — the PDF opens in the browser viewer
- Some in-app browsers may open an external viewer or offer a share sheet; a fallback link is shown if the file is missing
- Users can still save/share the PDF from the browser viewer if they want a local copy

The page intentionally has no document picker and almost no UI.

## Why static QR codes do not expire

- Codes are image files in this repository (`qr/…`)
- They encode a normal HTTPS URL on your domain
- There is no QR vendor account, API key, or subscription that can lapse
- The QR remains usable as long as:
  - the custom domain still points at this GitHub Pages site, and
  - GitHub Pages continues to serve the repository, and
  - the matching `events/<event>/<doc>.pdf` file exists (or is replaced in place)

## npm scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile the PDF router and bundle the browser QR generator |
| `npm run generate-qr` | Generate SVG/PNG QR codes from `events/` |
| `npm run create-samples` | Create placeholder demo PDFs |
| `npm run prepare-assets` | samples + QR + build |

## Search

The generator page has one title and description, a canonical URL, Open Graph and social metadata, structured data, `robots.txt`, `sitemap.xml`, and `llms.txt`. PDF routes under `/event/` and generated files under `/qr/` stay out of the sitemap. The PDF opener (`404.html`) is `noindex`.

Submit `https://static-hosting.biradarakshay.com/sitemap.xml` in Google Search Console after the domain answers over HTTPS.

## Analytics

Two cookieless tools, each for a different job. Neither loads until its value is set in `index.html` (`window.__analytics`). Neither receives the text typed into the page. Local hosts are ignored.

**Cloudflare Web Analytics** records visits, referrers, and Core Web Vitals.

1. In the Cloudflare dashboard, open Web Analytics and add `static-hosting.biradarakshay.com`.
2. Copy the site token into `window.__analytics.beacon`.

**Umami** records only these events:

| Event | When it is sent |
|---|---|
| `qr_ready` | The first code drawn on that page load. The text is not included. |
| `qr_download` | A PNG or SVG download. `kind` is `png` or `svg`. |

1. Create a site in Umami for `static-hosting.biradarakshay.com`.
2. Copy the website id into `window.__analytics.umamiId`.

These tools do not set cookies, so the page does not add a consent banner.

## Design principles

- Published site is static only: HTML / CSS / compiled JS
- No React, Next.js, Node backend, database, API, Docker, auth, or paid hosting
- TypeScript is used for local tooling and the PDF router source
- No third-party QR services
- Multiple events; new events = new folders
- Reliability and long-term maintainability over features
