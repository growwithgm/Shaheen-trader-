/* ui-bill.js — the billing screen.
   The one rule that governs this file: while the user is typing, nothing
   re-renders. Only the sibling field, this row's amount cell and the running
   total are touched, so the caret and the phone keyboard stay put. */
var UIBill = (function () {
  'use strict';

  var listHost, emptyAll, emptySearch, searchInput, numberInput, dateInput,
      partyBtn, partyName, selCount, tbTotal, reviewBtn;

  function valueOf(n) { return n ? Fmt.plain(n, 3) : ''; }

  /* never write into a field the user is currently in */
  function setVal(input, v) {
    if (!input || document.activeElement === input) { return; }
    input.value = valueOf(v);
  }

  function rowOf(el) {
    while (el && el !== listHost) {
      if (el.classList && el.classList.contains('irow')) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  function buildRow(item) {
    var row = App.h('div', 'irow');
    row.setAttribute('data-id', item.id);
    row.setAttribute('data-name', item.name.toLowerCase());

    var main = App.h('button', 'irow-main');
    main.type = 'button';
    var box = App.h('span', 'cbox', '✓');
    var t = App.h('div', 'irow-t');
    t.appendChild(App.h('div', 'irow-name', item.name));
    t.appendChild(App.h('div', 'irow-sub', 'Rs ' + Fmt.group(item.defaultRate, 2) + ' / ' + item.unit));
    var amt = App.h('div', 'irow-amt num', '—');
    main.appendChild(box); main.appendChild(t); main.appendChild(amt);

    var edit = App.h('div', 'irow-edit hidden');
    var grid = App.h('div', 'grid3');
    grid.appendChild(field('Qty', 'f-qty'));
    grid.appendChild(field('Rate', 'f-rate'));
    grid.appendChild(field('Amount', 'f-amt'));
    edit.appendChild(grid);

    var dw = App.h('label', 'detailwrap');
    dw.appendChild(App.h('span', '', 'Detail'));
    var di = App.h('input', 'f-detail');
    di.type = 'text';
    di.placeholder = 'optional — prints under the item name';
    dw.appendChild(di);
    edit.appendChild(dw);

    row.appendChild(main);
    row.appendChild(edit);

    var line = State.selectedFor(item.id);
    if (line) { dress(row, line, false); }
    return row;
  }

  function field(label, cls) {
    var w = App.h('label', 'minif');
    w.appendChild(App.h('span', '', label));
    var i = App.h('input', cls + ' num');
    i.type = 'text';
    i.inputMode = 'decimal';
    i.autocomplete = 'off';
    w.appendChild(i);
    return w;
  }

  function dress(row, line, focusQty) {
    row.classList.add('is-on');
    row.querySelector('.irow-edit').classList.remove('hidden');
    setVal(row.querySelector('.f-qty'), line.qty);
    setVal(row.querySelector('.f-rate'), line.rate);
    setVal(row.querySelector('.f-amt'), line.amount);
    row.querySelector('.f-detail').value = line.detail || '';
    row.querySelector('.irow-amt').textContent = line.amount > 0 ? Fmt.money(line.amount) : '—';
    if (focusQty) {
      var q = row.querySelector('.f-qty');
      q.focus();
      try { q.setSelectionRange(q.value.length, q.value.length); } catch (e) { /* not all inputs allow it */ }
    }
  }

  function undress(row) {
    row.classList.remove('is-on');
    row.querySelector('.irow-edit').classList.add('hidden');
    row.querySelector('.irow-amt').textContent = '—';
    row.querySelector('.f-qty').value = '';
    row.querySelector('.f-rate').value = '';
    row.querySelector('.f-amt').value = '';
    row.querySelector('.f-detail').value = '';
  }

  function toggle(row) {
    var id = row.getAttribute('data-id');
    if (State.isSelected(id)) {
      State.deselect(id);
      undress(row);
    } else {
      var line = State.select(id);
      if (!line) { return; }
      dress(row, line, true);
    }
    refreshTotal();
  }

  /* ---------------- the three-way sync ---------------- */

  function onInput(e) {
    var t = e.target;
    var row = rowOf(t);
    if (!row) { return; }
    var id = row.getAttribute('data-id');
    var line = State.selectedFor(id);
    if (!line) { return; }
    var v = Fmt.num(t.value);

    if (t.classList.contains('f-qty')) {
      State.setQty(id, v);
      setVal(row.querySelector('.f-amt'), line.amount);
    } else if (t.classList.contains('f-rate')) {
      State.setRate(id, v);
      setVal(row.querySelector('.f-amt'), line.amount);
    } else if (t.classList.contains('f-amt')) {
      State.setAmount(id, v);
      setVal(row.querySelector('.f-qty'), line.qty);
    } else if (t.classList.contains('f-detail')) {
      State.setDetail(id, t.value);
      return;
    } else {
      return;
    }
    row.querySelector('.irow-amt').textContent = line.amount > 0 ? Fmt.money(line.amount) : '—';
    refreshTotal();
  }

  /* tidy a half-typed number once the field is left */
  function onBlur(e) {
    var t = e.target;
    if (!t.classList || !/f-(qty|rate|amt)/.test(t.className)) { return; }
    var row = rowOf(t);
    if (!row) { return; }
    var line = State.selectedFor(row.getAttribute('data-id'));
    if (!line) { return; }
    if (t.classList.contains('f-qty')) { t.value = valueOf(line.qty); }
    else if (t.classList.contains('f-rate')) { t.value = valueOf(line.rate); }
    else { t.value = valueOf(line.amount); }
  }

  /* ---------------- list plumbing ---------------- */

  function buildList() {
    listHost.textContent = '';
    State.itemsSorted().forEach(function (it) { listHost.appendChild(buildRow(it)); });
    applyFilter();
  }

  function applyFilter() {
    var q = (searchInput.value || '').trim().toLowerCase();
    var rows = listHost.querySelectorAll('.irow');
    var shown = 0;
    for (var i = 0; i < rows.length; i++) {
      var hit = !q || rows[i].getAttribute('data-name').indexOf(q) >= 0;
      rows[i].style.display = hit ? '' : 'none';
      if (hit) { shown++; }
    }
    var any = State.get().items.length > 0;
    emptyAll.classList.toggle('hidden', any);
    emptySearch.classList.toggle('hidden', !any || shown > 0);
    listHost.classList.toggle('hidden', !any);
  }

  function refreshTotal() {
    var total = State.draftTotal();
    var lines = State.draftLines().length;
    tbTotal.textContent = Fmt.money(total);
    reviewBtn.disabled = lines === 0;
    selCount.textContent = lines ? lines + (lines === 1 ? ' line' : ' lines') : '';
  }

  function refreshBand() {
    if (!numberInput) { return; }
    var d = State.draft();
    if (document.activeElement !== numberInput) { numberInput.value = d.number || State.nextNumberString(); }
    if (document.activeElement !== dateInput) { dateInput.value = d.date || Store.todayISO(); }
    partyName.textContent = State.partyName(d.partyId);
    var out = d.partyId ? State.outstanding(d.partyId) : 0;
    partyName.classList.toggle('owed', out > 0);
  }

  /* ---------------- party picker ---------------- */

  function openPartyPicker() {
    var body = App.h('div');

    body.appendChild(pickRow('Cash Customer', 'Walk-in, paid on the spot', '', null));
    State.partiesSorted().forEach(function (p) {
      var out = State.outstanding(p.id);
      body.appendChild(pickRow(p.name, p.phone || p.address || '', out, p.id));
    });

    var add = App.h('button', 'addrow');
    add.type = 'button';
    add.appendChild(App.h('span', 'plus', '+'));
    add.appendChild(document.createTextNode(' Add new party'));
    add.addEventListener('click', function () {
      UIParties.openForm(null, function (party) {
        State.setDraft({ partyId: party.id, status: 'on-account' });
        refreshBand();
        App.sheet.close();
      });
    });
    body.appendChild(add);

    App.sheet.open('Bill to', body);
  }

  function pickRow(name, sub, out, id) {
    var b = App.h('button', 'rowbtn');
    b.type = 'button';
    var t = App.h('div', 'rowbtn-t');
    t.appendChild(App.h('div', 'rowbtn-name', name));
    if (sub) { t.appendChild(App.h('div', 'rowbtn-sub', sub)); }
    b.appendChild(t);
    if (out !== '' && out > 0) {
      var a = App.h('div', 'rowbtn-amt');
      a.appendChild(App.h('b', 'num owed', Fmt.money(out)));
      a.appendChild(App.h('span', '', 'outstanding'));
      b.appendChild(a);
    }
    b.addEventListener('click', function () {
      State.setDraft({ partyId: id, status: id ? 'on-account' : 'received' });
      refreshBand();
      App.sheet.close();
    });
    return b;
  }

  /* ---------------- review ---------------- */

  function openReview() {
    var lines = State.draftLines();
    if (!lines.length) { return; }

    var body = App.h('div');

    var list = App.h('div', 'linelist');
    lines.forEach(function (l) {
      var r = App.h('div', 'lineitem');
      r.appendChild(App.h('div', 'li-n', l.name));
      r.appendChild(App.h('div', 'li-q', Fmt.qty(l.qty) + ' ' + l.unit + ' × ' + Fmt.group(l.rate, 2)));
      r.appendChild(App.h('div', 'li-a', Fmt.group(l.amount, 2)));
      list.appendChild(r);
    });
    body.appendChild(list);

    var subRow = App.h('div', 'rvrow');
    subRow.appendChild(App.h('span', '', lines.length + (lines.length === 1 ? ' line' : ' lines') + ' · subtotal'));
    var subVal = App.h('b', 'num', Fmt.money(State.draftSubtotal()));
    subRow.appendChild(subVal);
    body.appendChild(subRow);

    var discWrap = App.h('div', 'formrow');
    discWrap.appendChild(App.h('span', 'lab', 'Discount'));
    var disc = App.h('input', 'num');
    disc.type = 'text';
    disc.inputMode = 'decimal';
    disc.value = State.draft().discount ? Fmt.plain(State.draft().discount, 2) : '';
    disc.placeholder = '0';
    discWrap.appendChild(disc);
    body.appendChild(discWrap);

    var chips = App.h('div', 'chips');
    body.appendChild(chips);

    var totalRow = App.h('div', 'rvtotal');
    totalRow.appendChild(App.h('span', '', 'Total'));
    var totalVal = App.h('b', 'num', Fmt.money(State.draftTotal()));
    totalRow.appendChild(totalVal);
    body.appendChild(totalRow);

    var seg = App.h('div', 'seg');
    var bRecv = App.h('button', '', 'Cash received');
    var bAcct = App.h('button', '', 'On account');
    bRecv.type = 'button'; bAcct.type = 'button';
    seg.appendChild(bRecv); seg.appendChild(bAcct);
    body.appendChild(seg);

    body.appendChild(App.h('p', 'sheetnote',
      'Payment status is kept in Records only. It is never printed on the invoice.'));

    var pad = App.h('div', 'actionpad');
    var save = App.h('button', 'btn btn-solid', 'Save invoice');
    save.type = 'button';
    pad.appendChild(save);
    body.appendChild(pad);

    function paintStatus() {
      var s = State.draft().status;
      bRecv.classList.toggle('is-on', s !== 'on-account');
      bAcct.classList.toggle('is-on', s === 'on-account');
    }
    bRecv.addEventListener('click', function () { State.setDraft({ status: 'received' }); paintStatus(); });
    bAcct.addEventListener('click', function () { State.setDraft({ status: 'on-account' }); paintStatus(); });
    paintStatus();

    function paintTotals() {
      subVal.textContent = Fmt.money(State.draftSubtotal());
      totalVal.textContent = Fmt.money(State.draftTotal());
      paintChips();
      refreshTotal();
    }

    /* round the total down to a neat figure — offered only when the gap
       is small enough to be a courtesy rather than a real discount */
    function paintChips() {
      chips.textContent = '';
      var total = State.draftTotal();
      [10, 50, 100].forEach(function (step) {
        var target = Math.floor(total / step) * step;
        var gap = Fmt.round(total - target, 2);
        if (gap <= 0 || gap > 200) { return; }
        var c = App.h('button', 'chip', '− ' + Fmt.group(gap, 2) + ' → ' + Fmt.money(target));
        c.type = 'button';
        c.addEventListener('click', function () {
          var d = Fmt.round(Fmt.num(State.draft().discount) + gap, 2);
          State.setDraft({ discount: d });
          disc.value = Fmt.plain(d, 2);
          paintTotals();
        });
        chips.appendChild(c);
      });
    }

    disc.addEventListener('input', function () {
      var v = Math.max(0, Math.min(Fmt.num(disc.value), State.draftSubtotal()));
      State.setDraft({ discount: v });
      paintTotals();
    });
    disc.addEventListener('blur', function () {
      var d = Fmt.num(State.draft().discount);
      disc.value = d ? Fmt.plain(d, 2) : '';
    });

    save.addEventListener('click', function () {
      var inv = State.saveInvoice();
      if (!inv) { App.toast('Nothing to save'); return; }
      App.sheet.close();
      refresh();
      UIRecords.refresh();
      UIParties.refresh();
      App.toast('Invoice ' + inv.number + ' saved');
      Invoice.open(inv.id);
    });

    paintTotals();
    App.sheet.open('Review invoice', body);
  }

  /* ---------------- mount ---------------- */

  function refresh() {
    buildList();
    refreshBand();
    refreshTotal();
  }

  function mount() {
    listHost = document.getElementById('itemList');
    emptyAll = document.getElementById('itemListEmpty');
    emptySearch = document.getElementById('itemSearchEmpty');
    searchInput = document.getElementById('itemSearch');
    numberInput = document.getElementById('billNumber');
    dateInput = document.getElementById('billDate');
    partyBtn = document.getElementById('billPartyBtn');
    partyName = document.getElementById('billPartyName');
    selCount = document.getElementById('billSelCount');
    tbTotal = document.getElementById('tbTotal');
    reviewBtn = document.getElementById('reviewBtn');

    listHost.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== listHost && !(t.classList && t.classList.contains('irow-main'))) { t = t.parentNode; }
      if (!t || t === listHost) { return; }
      var row = rowOf(t);
      if (row) { toggle(row); }
    });
    listHost.addEventListener('input', onInput);
    listHost.addEventListener('focusout', onBlur);

    searchInput.addEventListener('input', applyFilter);

    numberInput.addEventListener('input', function () { State.setDraft({ number: numberInput.value }); });
    dateInput.addEventListener('change', function () { State.setDraft({ date: dateInput.value || Store.todayISO() }); });
    partyBtn.addEventListener('click', openPartyPicker);
    reviewBtn.addEventListener('click', openReview);

    document.getElementById('billAddItem').addEventListener('click', function () {
      UIItems.openForm(null, function (item) {
        buildList();
        searchInput.value = '';
        applyFilter();
        var row = listHost.querySelector('.irow[data-id="' + item.id + '"]');
        if (row && !State.isSelected(item.id)) {
          var line = State.select(item.id);
          dress(row, line, true);
          refreshTotal();
          row.scrollIntoView({ block: 'center' });
        }
      });
    });

    refresh();
  }

  return { mount: mount, refresh: refresh, refreshTotal: refreshTotal, refreshBand: refreshBand };
})();
