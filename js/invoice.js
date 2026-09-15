/* invoice.js — the A5 document, and printing it.
   What is deliberately absent from this file, and must stay absent:
   a payment status, a supply details block, a terms block, and any tax
   number belonging to the buyer. */
var Invoice = (function () {
  'use strict';

  var view, docEl, fitEl, stage, numberEl, current = null, pushed = false;

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
    var table = document.createElement('table');
    table.className = 'd-metatable';
    var tb = document.createElement('tbody');
    tb.appendChild(metaRow('Invoice No.', inv.number));
    tb.appendChild(metaRow('Date', Fmt.date(inv.date)));
    table.appendChild(tb);
    meta.appendChild(table);
    head.appendChild(meta);

    docEl.appendChild(head);

    /* 2 — the rule */
    docEl.appendChild(App.h('div', 'd-rule'));

    /* 3 — bill to. The right half of this band stays empty by design. */
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

  function metaRow(label, value) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.textContent = label;
    var td = document.createElement('td');
    td.textContent = value;
    tr.appendChild(th); tr.appendChild(td);
    return tr;
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

  function mount() {
    view = document.getElementById('invoiceView');
    docEl = document.getElementById('doc');
    fitEl = document.getElementById('ivFit');
    stage = document.getElementById('ivStage');
    numberEl = document.getElementById('ivNumber');

    document.getElementById('ivBack').addEventListener('click', close);
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
