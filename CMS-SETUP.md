# Castellanos admin setup

This site is a static HTML/CSS/JS website with a Netlify-powered visual dashboard.

## Public website

- Main website: `/`
- Editable fallback content: `content/site.json`
- Runtime content loader: `cms-runtime.js`

The public website first tries to load content from Netlify Blobs through:

```text
/.netlify/functions/get-content
```

If Blobs content is not available yet, it falls back to:

```text
content/site.json
```

## Admin routes

- Visual dashboard: `/dashboard/`
- Dedicated leads inbox: `/dashboard/leads/`
- Login/start page: `/admin/login.html`
- Advanced Decap editor: `/admin/`

The recommended client-facing admin start page is:

```text
/admin/login.html
```

It shows two main options:

- Edit Website
- View Leads

Decap remains available only as an advanced fallback editor.

## Netlify features used

- Netlify Identity for admin login
- Netlify Functions for API endpoints
- Netlify Blobs for saved website content and leads
- Netlify Forms for lead email notifications

## Required Netlify setup

1. Connect the GitHub repository to Netlify.
2. Build settings:
   - Build command: leave empty or use `npm install`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
3. Enable Netlify Identity.
4. Invite the client/admin email in Identity.
5. Configure form submission email notifications in Netlify.

## Dashboard capabilities

The visual dashboard can edit:

- Business info
- Homepage hero
- Services
- Projects
- Media library uploads
- FAQ
- SEO
- Tracking / pixels

It can also show quote leads stored in Netlify Blobs.

## Leads

The quote form still submits to Netlify Forms so email notifications can work.

The same lead is also copied to Netlify Blobs through:

```text
/.netlify/functions/submit-lead
```

Dashboard leads are loaded from:

```text
/.netlify/functions/get-leads
```

## Media uploads

The dashboard includes a Media Library panel. Admin users can upload:

- JPG
- PNG
- WebP
- GIF
- MP4
- WebM

Uploaded files are stored in Netlify Blobs and served through:

```text
/.netlify/functions/media?key=...
```

Recommended limits:

- Images: under 2 MB
- Videos: under 8 MB

Most image fields include an inline Upload button. The dashboard uploads the file, stores it in Netlify Blobs, and fills the field automatically.

The Media Library can also be used to copy a generated media URL and paste it into the relevant field:

- Hero background image
- Service image
- Project/gallery image
- Video field/path when used

## Local testing

Static preview only:

```bash
npx serve . -l 4173
```

Full Netlify Functions testing:

```bash
npm install
npx netlify dev
```

Full local auth behavior depends on Netlify Identity configuration.
