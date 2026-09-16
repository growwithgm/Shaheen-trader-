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
js/catalogue.js   the produce suggestion dictionary (English + Roman Urdu)
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
`<body>` — no modules, no imports. Two pinned third-party files, `html2canvas`
1.4.1 and `jspdf` 2.5.1, load `async` from cdnjs and are used only by the
WhatsApp share; the service worker caches them, so sharing keeps working
offline after the first online visit. Every path in the project is relative, because
GitHub Pages serves this from `/Shaheen-trader-/` and a leading slash would 404.

## GitHub Pages

Settings → Pages → **Deploy from a branch**, branch `main`, folder `/ (root)`.
Pushing to `main` publishes; there is no workflow and no build.

After a deploy the browser may still hold the old service worker for a moment.
A second refresh picks up the new version.

## Finding an item: Roman Urdu search

The item master starts empty and only ever holds what has actually been billed.
Underneath it sits a built-in dictionary of produce sold in Pakistan — it is not
a catalogue you browse and it carries no rates. It only surfaces in the Bill
tab's search box, under *Add from list*, below your own matching items.

Search matches the English name and the Roman Urdu word: `aloo` finds Potato,
`tamatar` finds Tomato, `bhindi` finds Okra, `kela` finds Banana. Tapping a
suggestion creates the item, drops it onto the invoice with the cursor in the
qty field, and from then on it is an ordinary saved item — put a rate on it once
and it stays. A saved item keeps answering to the same Roman Urdu word.

To add something the dictionary does not know, use **+ Add new item**.

## Qty and weight

A line carries two numbers. **Qty** is how many bags, crates or packets went
out; **weight** is the amount the rate is charged on, in that item's unit. One
bag of potatoes weighing 32 kg at Rs 62/kg is qty 1, weight 32 kg, amount
Rs 1,984 — the money follows the weight, and the qty is there so the buyer can
count what arrived. Qty defaults to 1, so the common case needs no typing.

## Sharing on WhatsApp

The invoice view has **Share on WhatsApp** next to Print / PDF. It snapshots the
A5 page, builds a PDF, and hands it to the phone's share sheet, so it can be
sent into any chat. If the party has a saved phone number, the desktop fallback
opens that chat directly (`0300…` is converted to `92300…`).

Two things worth knowing:

- The PDF is a **raster** of the page: it looks exactly like the print, but the
  text is not selectable and the file is roughly 200–400 KB. That is fine for
  WhatsApp. If the size ever becomes a problem, the fix is to redraw the invoice
  with jsPDF's text API instead of snapshotting it — crisp vector text at around
  30 KB, at the cost of maintaining the layout in two places.
- File sharing needs **HTTPS**. GitHub Pages serves over HTTPS so this works
  live, but it will not work when `index.html` is opened from `file://` during
  local testing. On desktop browsers, which mostly cannot share files, the PDF
  downloads and a WhatsApp link opens so you can attach it yourself.

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
5. No pre-loaded item *master*. The app's own item list ships empty and only
   fills with what has been billed. The built-in dictionary is a search aid with
   no rates, never a list you scroll.
6. The invoice number is editable on every invoice.
