/* invoice.js — the A5 document, and printing it.
   What is deliberately absent from this file, and must stay absent:
   a payment status, a supply details block, a terms block, and any tax
   number belonging to the buyer. */
var Invoice = (function () {
  'use strict';

  var view, docEl, fitEl, stage, numberEl, shareBtn, current = null, pushed = false, busy = false;

  function txt(el, s) { el.textContent = s; return el; }

  function open(invoiceId) {
    var inv = State.invoiceById(invoiceId);
    if (!inv) { App.toast('That invoice is gone'); return; }
    current = inv;
    render(inv);
    view.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (!pushed) {
      try { history.pushState({ shInvoice: 1 }, ''); pushed = true; } catch (e) { /* file:// has no history API in some browsers */ }
    }
    fit();
    view.scrollTop = 0;
  }

  function hide() {
    view.classList.add('hidden');
    document.body.style.overflow = '';
    current = null;
  }

  function close() {
    if (pushed) {
      pushed = false;
      try { history.back(); return; } catch (e) { /* fall through */ }
    }
    hide();
  }

  function render(inv) {
    var b = State.business();
    var party = State.partyById(inv.partyId);
    numberEl.textContent = inv.number;
    docEl.textContent = '';

    /* 1 — letterhead */
    var head = App.h('div', 'd-head');

    var logo = document.createElement('img');
    logo.className = 'd-logo';
    logo.src = './logo.png';
    logo.alt = '';
    head.appendChild(logo);

    var id = App.h('div', 'd-id');
    id.appendChild(App.h('h1', 'd-name', b.name || 'Shaheen Traders'));
    var lines = App.h('div', 'd-lines');
    if (b.address) { lines.appendChild(App.h('div', '', b.address)); }
    var contact = [b.phone, b.email].filter(Boolean).join('  ·  ');
    if (contact) { lines.appendChild(App.h('div', '', contact)); }
    var tax = [];
    if (b.ntn) { tax.push('NTN ' + b.ntn); }
    if (b.strn) { tax.push('STRN ' + b.strn); }
    if (tax.length) { lines.appendChild(App.h('div', '', tax.join('  ·  '))); }
    id.appendChild(lines);
    head.appendChild(id);

    var meta = App.h('div', 'd-meta');
    meta.appendChild(App.h('div', 'd-inv', 'INVOICE'));
    var metaBlock = App.h('div', 'd-metablock');
    metaBlock.appendChild(metaRow('Invoice No.', inv.number));
    metaBlock.appendChild(metaRow('Date', Fmt.date(inv.date)));
    meta.appendChild(metaBlock);
    head.appendChild(meta);

    docEl.appendChild(head);

    /* 2 — the rule */
    docEl.appendChild(App.h('div', 'd-rule'));

    /* 3 — bill to. The right half of this band stays empty by design:
       no supply details, ever. */
    var billto = App.h('div', 'd-billto');
    billto.appendChild(App.h('p', 'd-lbl', 'BILL TO'));
    billto.appendChild(App.h('p', 'd-party', party ? party.name : 'Cash Customer'));
    if (party) {
      var sub = [party.address, party.phone].filter(Boolean).join('\n');
      if (sub) { billto.appendChild(App.h('p', 'd-partysub', sub)); }
    }
    docEl.appendChild(billto);

    /* 4 — line items */
    var t = document.createElement('table');
    t.className = 'd-table';
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');
    [['#', 'c-n'], ['Description', 'c-d'], ['Qty', 'c-q'], ['Rate', 'c-r'], ['Amount', 'c-a']]
      .forEach(function (c) {
        var th = document.createElement('th');
        th.className = c[1];
        th.textContent = c[0];
        htr.appendChild(th);
      });
    thead.appendChild(htr);
    t.appendChild(thead);

    var tbody = document.createElement('tbody');
    inv.lines.forEach(function (l, i) {
      var tr = document.createElement('tr');
      tr.appendChild(cell(String(i + 1), 'c-n'));
      var d = document.createElement('td');
      d.className = 'c-d';
      d.appendChild(document.createTextNode(l.name));
      if (l.detail) { d.appendChild(App.h('span', 'd-detail', l.detail)); }
      tr.appendChild(d);
      tr.appendChild(cell(Fmt.qty(l.qty) + ' ' + l.unit, 'c-q'));
      tr.appendChild(cell(Fmt.group(l.rate, 2), 'c-r'));
      tr.appendChild(cell(Fmt.group(l.amount, 2), 'c-a'));
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    docEl.appendChild(t);

    /* 5 — totals, with the amount in words to their left */
    var subtotal = inv.lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var foot = App.h('div', 'd-foot');

    var words = App.h('div', 'd-words');
    words.appendChild(App.h('p', 'd-lbl', 'AMOUNT IN WORDS'));
    words.appendChild(App.h('p', '', Fmt.words(inv.total)));
    foot.appendChild(words);

    var totals = App.h('div', 'd-totals');
    totals.appendChild(trow('Subtotal', Fmt.group(subtotal, 2)));
    if (inv.discount) { totals.appendChild(trow('Discount', '− ' + Fmt.group(inv.discount, 2))); }
    var box = App.h('div', 'd-tbox');
    box.appendChild(App.h('span', '', 'Total'));
    box.appendChild(App.h('b', '', 'Rs ' + Fmt.group(inv.total, 2)));
    totals.appendChild(box);
    foot.appendChild(totals);

    docEl.appendChild(foot);

    /* 6 — signature only. Nothing on the left. */
    var sign = App.h('div', 'd-sign');
    sign.appendChild(App.h('div', 'd-signbox', 'for ' + (b.name || 'Shaheen Traders')));
    docEl.appendChild(sign);
  }

  /* label and value sit side by side on one right-aligned line, so a short
     number never leaves a hole between the two */
  function metaRow(label, value) {
    var row = App.h('div', 'd-metarow');
    row.appendChild(App.h('span', '', label));
    row.appendChild(App.h('b', '', value));
    return row;
  }

  function cell(text, cls) {
    var td = document.createElement('td');
    td.className = cls;
    td.textContent = text;
    return td;
  }

  function trow(label, value) {
    var r = App.h('div', 'd-trow');
    r.appendChild(App.h('span', '', label));
    r.appendChild(App.h('b', '', value));
    return r;
  }

  /* The preview scales to the phone; print ignores the transform entirely. */
  function fit() {
    if (view.classList.contains('hidden')) { return; }
    var probe = document.getElementById('mmProbe');
    var mm = probe.getBoundingClientRect().width / 100;
    if (!mm) { return; }
    var avail = stage.clientWidth - 24;
    var docW = 148 * mm;
    var scale = Math.min(1, avail / docW);
    fitEl.style.width = docW + 'px';
    fitEl.style.transform = scale < 1 ? 'scale(' + scale + ')' : 'none';
    fitEl.style.marginLeft = Math.max(0, (avail - docW * scale) / 2) + 'px';
    stage.style.height = Math.ceil(docEl.offsetHeight * scale) + 'px';
  }

  /* ---------------- WhatsApp ----------------
     The invoice on screen is snapshotted into an A5 PDF and handed to the
     phone's share sheet. Raster, so it looks exactly like the print. */

  function libsReady() {
    return typeof window.html2canvas === 'function' && window.jspdf && window.jspdf.jsPDF;
  }

  function fileNameFor(inv) {
    var party = State.partyById(inv.partyId);
    var base = 'Invoice-' + inv.number + '-' + (party ? party.name : 'Cash Customer');
    return base.replace(/[\\/]+/g, '').replace(/\s+/g, '') + '.pdf';
  }

  function waMessage(inv) {
    var b = State.business();
    var party = State.partyById(inv.partyId);
    return [
      b.name || 'Shaheen Traders',
      'Invoice ' + inv.number,
      party ? party.name : 'Cash Customer',
      'Total: Rs ' + Fmt.group(inv.total, 2)
    ].join('\n');
  }

  /* 0300… -> 92300…, so a saved number opens that chat directly */
  function waPhone(inv) {
    var party = State.partyById(inv.partyId);
    var d = String((party && party.phone) || '').replace(/[^0-9]/g, '');
    if (!d) { return ''; }
    if (d.charAt(0) === '0') { return '92' + d.slice(1); }
    if (d.length === 10 && d.charAt(0) === '3') { return '92' + d; }
    return d;
  }

  function waUrl(inv) {
    return 'https://wa.me/' + waPhone(inv) + '?text=' + encodeURIComponent(waMessage(inv));
  }

  function buildPdfBlob() {
    return new Promise(function (resolve, reject) {
      if (!libsReady()) { reject(new Error('libs')); return; }

      /* the preview transform must come off, or the snapshot scales wrong */
      var prevTransform = fitEl.style.transform;
      var prevMargin = fitEl.style.marginLeft;
      var prevHeight = stage.style.height;
      var prevBorder = docEl.style.border;
      function restore() {
        fitEl.style.transform = prevTransform;
        fitEl.style.marginLeft = prevMargin;
        stage.style.height = prevHeight;
        docEl.style.border = prevBorder;
        fit();
      }
      fitEl.style.transform = 'none';
      fitEl.style.marginLeft = '0';
      stage.style.height = '';
      docEl.style.border = 'none';   /* the preview's edge is not part of the page */

      window.html2canvas(docEl, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false })
        .then(function (canvas) {
          restore();
          var pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
          var W = 148, H = 210;
          /* JPEG, not PNG: jsPDF stores an unsupported PNG as a raw bitmap and
             a 15MB file is useless on WhatsApp. This lands around 300KB. */
          var img = canvas.toDataURL('image/jpeg', 0.92);
          var imgH = canvas.height * W / canvas.width;
          if (imgH <= H + 1) {
            pdf.addImage(img, 'JPEG', 0, 0, W, H);
          } else {
            /* a long invoice keeps its proportions and runs onto more pages */
            var y = 0, page = 0;
            while (y < imgH - 0.5 && page < 20) {
              if (page > 0) { pdf.addPage(); }
              pdf.addImage(img, 'JPEG', 0, -y, W, imgH);
              y += H;
              page++;
            }
          }
          resolve(pdf.output('blob'));
        })['catch'](function (err) { restore(); reject(err); });
    });
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function fallbackShare(blob, name, inv) {
    download(blob, name);
    App.toast('PDF downloaded — attach it in WhatsApp');
    try { window.open(waUrl(inv), '_blank'); } catch (e) { /* popup blocked, the file is still there */ }
  }

  function setBusy(on) {
    busy = on;
    shareBtn.disabled = on;
    shareBtn.textContent = on ? 'Preparing PDF…' : 'Share on WhatsApp';
  }

  function share() {
    if (busy || !current) { return; }
    var inv = current;
    if (!libsReady()) {
      App.toast(navigator.onLine
        ? 'PDF tools are still loading — try again in a moment'
        : 'Open the app once with internet, then sharing works offline too');
      return;
    }
    setBusy(true);
    buildPdfBlob().then(function (blob) {
      var name = fileNameFor(inv);
      var file = null;
      try { file = new File([blob], name, { type: 'application/pdf' }); } catch (e) { file = null; }
      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: name })['catch'](function (err) {
          if (err && err.name === 'AbortError') { return; }   /* user backed out — say nothing */
          fallbackShare(blob, name, inv);
        });
      }
      fallbackShare(blob, name, inv);
    })['catch'](function () {
      App.toast('Could not make the PDF — use Print / PDF instead');
    }).then(function () { setBusy(false); });
  }

  function mount() {
    view = document.getElementById('invoiceView');
    docEl = document.getElementById('doc');
    fitEl = document.getElementById('ivFit');
    stage = document.getElementById('ivStage');
    numberEl = document.getElementById('ivNumber');
    shareBtn = document.getElementById('ivShare');

    document.getElementById('ivBack').addEventListener('click', close);
    shareBtn.addEventListener('click', share);
    document.getElementById('ivPrint').addEventListener('click', function () {
      try { window.print(); } catch (e) { App.toast('Printing is not available here'); }
    });

    window.addEventListener('resize', fit);
    window.addEventListener('popstate', function () {
      if (!view.classList.contains('hidden')) { pushed = false; hide(); }
    });
    window.addEventListener('beforeprint', function () {
      /* the document must not be mid-load when the dialog opens */
      if (view.classList.contains('hidden') && current) { view.classList.remove('hidden'); }
    });
  }

  function isOpen() { return view && !view.classList.contains('hidden'); }

  return { mount: mount, open: open, close: close, fit: fit, isOpen: isOpen };
})();
