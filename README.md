# Shaheen Traders — invoicing

A mobile-first invoicing app for **Shaheen Traders**, fruit and vegetable trading,
Sargodha. Bill a wholesale buyer or a walk-in cash customer from the phone, then
print or PDF a clean A5 invoice in English.

Live: **https://growwithgm.github.io/Shaheen-trader-/**

Plain HTML, CSS and vanilla JavaScript. No framework, no npm, no build step.
Everything is stored in the browser, so the app works with no network at all.

## Running it locally

Open `index.html` in a browser — that is enough for everything except the
service worker (browsers only register one over `http`/`https`).

To get the installable, offline-capable behaviour, serve the folder over HTTP:

```sh
python3 -m http.server 8080
# then open http://localhost:8080/
```

Any static server works. There is nothing to install and nothing to compile.

## How it is laid out

```
index.html        the whole shell — tabs are sections that show and hide
styles.css        design tokens, light and dark, and the A5 print rules
logo.png          used in the app header and on the invoice letterhead
manifest.json     PWA manifest (installable from the browser menu)
sw.js             caches the shell so the app opens offline
icon-*.png        app icons, generated from the logo
js/store.js       localStorage read/write, schema defaults, export & import
js/state.js       the in-memory book, the draft invoice, derived totals
js/ui-bill.js     the billing screen
js/ui-items.js    the item master
js/ui-parties.js  parties, outstanding balances and payments
js/ui-records.js  saved invoices
js/ui-setup.js    business details, backup and restore
js/invoice.js     the A5 document and printing
js/app.js         boot, tab navigation, sheets, toasts
```

Scripts are ordinary `<script src="./…">` tags in dependency order at the end of
`<body>` — no modules, no imports. Every path in the project is relative, because
GitHub Pages serves this from `/Shaheen-trader-/` and a leading slash would 404.

## GitHub Pages

Settings → Pages → **Deploy from a branch**, branch `main`, folder `/ (root)`.
Pushing to `main` publishes; there is no workflow and no build.

After a deploy the browser may still hold the old service worker for a moment.
A second refresh picks up the new version.

## Printing

The invoice view has a **Print / PDF** button. In the print dialog set the paper
size to **A5** — the page is laid out in millimetres at 148 × 210 mm with a 10 mm
margin, and long invoices flow to a second page with the table header repeated.
"Save as PDF" produces the file to send on WhatsApp.

## Your data lives on the device

Everything — business details, items, parties, invoices and payments — is stored
in this browser's `localStorage`, on this one device. Nothing is uploaded and
there is no account to log into. That means:

- clearing browser data, or "clear site storage", erases it
- a new phone starts empty
- private / incognito windows keep nothing after they close

**Take a backup.** Setup → *Download backup* saves a `.json` file with everything
in it; Setup → *Restore backup* reads one back on any device. This is the only
way records survive a lost or wiped phone.

## House rules for the printed invoice

These came from the client and are deliberate. Do not reintroduce them:

1. No paid / unpaid marking of any kind on the invoice. Payment status is kept
   in Records, inside the app, and is never printed.
2. No supply details block.
3. No terms block — the footer holds the signature line only.
4. Only the seller's NTN and STRN appear. A party has no tax fields at all, and
   the buyer's numbers are never printed.
5. No pre-loaded item catalogue. The app ships empty.
6. The invoice number is editable on every invoice.
