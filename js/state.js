/* state.js — the in-memory book, the draft invoice, and everything derived
   from them. Nothing in here touches the DOM. */

var Fmt = (function () {
  'use strict';

  function num(v) {
    if (typeof v === 'number') { return isFinite(v) ? v : 0; }
    var s = String(v == null ? '' : v).replace(/,/g, '').trim();
    var x = parseFloat(s);
    return isFinite(x) ? x : 0;
  }

  function round(v, places) {
    var f = Math.pow(10, places);
    return Math.round((num(v) + Number.EPSILON) * f) / f;
  }

  /* trims trailing zeros: 12.50 -> "12.5", 12.00 -> "12" */
  function plain(v, places) {
    var r = round(v, places == null ? 2 : places);
    return String(r);
  }

  function group(v, places, trim) {
    var pl = places == null ? 2 : places;
    var r = round(v, pl);
    var neg = r < 0;
    r = Math.abs(r);
    var whole = Math.floor(r);
    var frac = round(r - whole, pl);
    var s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (frac > 0) {
      var f = frac.toFixed(pl).slice(1);
      if (trim) { f = f.replace(/0+$/, ''); }
      if (f !== '.') { s += f; }
    }
    return (neg ? '-' : '') + s;
  }

  function money(v) { return 'Rs ' + group(v, 2); }

  function qty(v) { return group(v, 3, true); }

  function date(iso) {
    if (!iso) { return ''; }
    var p = String(iso).split('-');
    if (p.length !== 3) { return iso; }
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var mi = parseInt(p[1], 10) - 1;
    if (mi < 0 || mi > 11) { return iso; }
    return parseInt(p[2], 10) + ' ' + months[mi] + ' ' + p[0];
  }

  var ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function under100(x) {
    if (x < 20) { return ONES[x]; }
    var t = TENS[Math.floor(x / 10)];
    var o = x % 10;
    return o ? t + '-' + ONES[o] : t;
  }

  function under1000(x) {
    if (x < 100) { return under100(x); }
    var h = Math.floor(x / 100);
    var rest = x % 100;
    return ONES[h] + ' hundred' + (rest ? ' ' + under100(rest) : '');
  }

  /* Pakistani numbering: arab, crore, lac, thousand, hundred */
  function chunks(x) {
    var parts = [];
    var scales = [[10000000, 'crore'], [100000, 'lac'], [1000, 'thousand']];
    if (x >= 1000000000) {
      var a = Math.floor(x / 1000000000);
      parts.push(under1000(a) + ' arab');
      x = x % 1000000000;
    }
    for (var i = 0; i < scales.length; i++) {
      var v = Math.floor(x / scales[i][0]);
      if (v > 0) { parts.push(under1000(v) + ' ' + scales[i][1]); x = x % scales[i][0]; }
    }
    if (x > 0) { parts.push(under1000(x)); }
    return parts.join(' ');
  }

  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* "Twelve thousand five hundred rupees only" */
  function words(value) {
    var v = Math.abs(round(value, 2));
    var rupees = Math.floor(v);
    var paisa = Math.round((v - rupees) * 100);
    if (paisa === 100) { rupees += 1; paisa = 0; }
    var s = rupees === 0 ? 'zero' : chunks(rupees);
    s += rupees === 1 ? ' rupee' : ' rupees';
    if (paisa > 0) { s += ' and ' + under100(paisa) + (paisa === 1 ? ' paisa' : ' paise'); }
    return cap(s + ' only');
  }

  return { num: num, round: round, plain: plain, group: group, money: money, qty: qty, date: date, words: words };
})();


var State = (function () {
  'use strict';

  var data = Store.defaults();
  var timer = null;
  var listeners = [];

  function init() {
    data = Store.load();
    /* a fresh draft still needs a number suggestion */
    if (!data.draft.number) { data.draft.number = nextNumberString(); }
  }

  function get() { return data; }
  function business() { return data.business; }
  function draft() { return data.draft; }

  function persist(immediate) {
    if (timer) { clearTimeout(timer); timer = null; }
    if (immediate) { return Store.save(data); }
    timer = setTimeout(function () { timer = null; Store.save(data); }, 250);
    return true;
  }

  function onChange(fn) { listeners.push(fn); }
  function changed(what) {
    listeners.forEach(function (fn) { try { fn(what); } catch (e) { /* a broken view must not stop the rest */ } });
  }

  /* ---------------- lookups ---------------- */

  function itemById(id) {
    for (var i = 0; i < data.items.length; i++) { if (data.items[i].id === id) { return data.items[i]; } }
    return null;
  }

  function partyById(id) {
    if (!id) { return null; }
    for (var i = 0; i < data.parties.length; i++) { if (data.parties[i].id === id) { return data.parties[i]; } }
    return null;
  }

  function partyName(id) {
    var p = partyById(id);
    return p ? p.name : 'Cash Customer';
  }

  function invoiceById(id) {
    for (var i = 0; i < data.invoices.length; i++) { if (data.invoices[i].id === id) { return data.invoices[i]; } }
    return null;
  }

  function itemsSorted() {
    return data.items.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function partiesSorted() {
    return data.parties.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  function invoicesSorted() {
    return data.invoices.slice().sort(function (a, b) {
      if (a.date !== b.date) { return a.date < b.date ? 1 : -1; }
      return b.createdAt - a.createdAt;
    });
  }

  /* ---------------- items ---------------- */

  function addItem(name, unit, rate) {
    var it = {
      id: Store.uid('it_'),
      name: String(name).trim(),
      unit: Store.UNITS.indexOf(unit) >= 0 ? unit : 'kg',
      defaultRate: Fmt.round(rate, 2),
      createdAt: Date.now()
    };
    data.items.push(it);
    persist(true);
    changed('items');
    return it;
  }

  function updateItem(id, name, unit, rate) {
    var it = itemById(id);
    if (!it) { return null; }
    it.name = String(name).trim();
    it.unit = Store.UNITS.indexOf(unit) >= 0 ? unit : it.unit;
    it.defaultRate = Fmt.round(rate, 2);
    persist(true);
    changed('items');
    return it;
  }

  function deleteItem(id) {
    data.items = data.items.filter(function (i) { return i.id !== id; });
    data.draft.selected = data.draft.selected.filter(function (s) { return s.itemId !== id; });
    persist(true);
    changed('items');
  }

  /* ---------------- parties ---------------- */

  function addParty(name, phone, address) {
    var p = {
      id: Store.uid('pt_'),
      name: String(name).trim(),
      phone: String(phone || '').trim(),
      address: String(address || '').trim(),
      createdAt: Date.now()
    };
    data.parties.push(p);
    persist(true);
    changed('parties');
    return p;
  }

  function updateParty(id, name, phone, address) {
    var p = partyById(id);
    if (!p) { return null; }
    p.name = String(name).trim();
    p.phone = String(phone || '').trim();
    p.address = String(address || '').trim();
    persist(true);
    changed('parties');
    return p;
  }

  function deleteParty(id) {
    data.parties = data.parties.filter(function (p) { return p.id !== id; });
    data.payments = data.payments.filter(function (p) { return p.partyId !== id; });
    data.invoices.forEach(function (inv) { if (inv.partyId === id) { inv.partyId = null; } });
    if (data.draft.partyId === id) { data.draft.partyId = null; }
    persist(true);
    changed('parties');
  }

  /* ---------------- money owed ---------------- */

  function invoicesFor(partyId) {
    return data.invoices.filter(function (i) { return i.partyId === partyId; });
  }

  function paymentsFor(partyId) {
    return data.payments.filter(function (p) { return p.partyId === partyId; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }

  function paidTotal(partyId) {
    return paymentsFor(partyId).reduce(function (s, p) { return s + p.amount; }, 0);
  }

  function billedOnAccount(partyId) {
    return invoicesFor(partyId).reduce(function (s, i) {
      return s + (i.status === 'on-account' ? i.total : 0);
    }, 0);
  }

  function outstanding(partyId) {
    return Math.max(0, Fmt.round(billedOnAccount(partyId) - paidTotal(partyId), 2));
  }

  function totalOutstanding() {
    return data.parties.reduce(function (s, p) { return s + outstanding(p.id); }, 0);
  }

  /* Oldest open invoice settles first. Returns every on-account invoice for the
     party with how much of it a payment has covered. */
  function allocation(partyId) {
    var pool = paidTotal(partyId);
    var open = invoicesFor(partyId)
      .filter(function (i) { return i.status === 'on-account'; })
      .sort(function (a, b) {
        if (a.date !== b.date) { return a.date < b.date ? -1 : 1; }
        return a.createdAt - b.createdAt;
      });
    return open.map(function (inv) {
      var paid = Math.min(pool, inv.total);
      pool = Fmt.round(pool - paid, 2);
      return { invoice: inv, paid: Fmt.round(paid, 2), due: Fmt.round(inv.total - paid, 2) };
    });
  }

  function addPayment(partyId, amount, date) {
    var p = {
      id: Store.uid('pm_'),
      partyId: partyId,
      amount: Fmt.round(amount, 2),
      date: date || Store.todayISO()
    };
    data.payments.push(p);
    persist(true);
    changed('parties');
    return p;
  }

  function deletePayment(id) {
    data.payments = data.payments.filter(function (p) { return p.id !== id; });
    persist(true);
    changed('parties');
  }

  /* ---------------- the draft ---------------- */

  function selectedFor(itemId) {
    for (var i = 0; i < data.draft.selected.length; i++) {
      if (data.draft.selected[i].itemId === itemId) { return data.draft.selected[i]; }
    }
    return null;
  }

  function isSelected(itemId) { return !!selectedFor(itemId); }

  function select(itemId) {
    var existing = selectedFor(itemId);
    if (existing) { return existing; }
    var it = itemById(itemId);
    if (!it) { return null; }
    var line = { itemId: itemId, qty: 0, rate: it.defaultRate, amount: 0, detail: '' };
    data.draft.selected.push(line);
    persist();
    return line;
  }

  function deselect(itemId) {
    data.draft.selected = data.draft.selected.filter(function (s) { return s.itemId !== itemId; });
    persist();
  }

  function setQty(itemId, qty) {
    var l = selectedFor(itemId);
    if (!l) { return null; }
    l.qty = Fmt.round(qty, 3);
    l.amount = Fmt.round(l.qty * l.rate, 2);
    persist();
    return l;
  }

  function setRate(itemId, rate) {
    var l = selectedFor(itemId);
    if (!l) { return null; }
    l.rate = Fmt.round(rate, 2);
    l.amount = Fmt.round(l.qty * l.rate, 2);
    persist();
    return l;
  }

  function setAmount(itemId, amount) {
    var l = selectedFor(itemId);
    if (!l) { return null; }
    l.amount = Fmt.round(amount, 2);
    if (l.rate > 0) { l.qty = Fmt.round(l.amount / l.rate, 3); }
    persist();
    return l;
  }

  function setDetail(itemId, detail) {
    var l = selectedFor(itemId);
    if (!l) { return null; }
    l.detail = String(detail || '');
    persist();
    return l;
  }

  function setDraft(patch) {
    Object.keys(patch).forEach(function (k) { data.draft[k] = patch[k]; });
    persist();
  }

  /* Lines are denormalised here — the name and unit are copied onto the line so
     renaming an item later never rewrites an invoice that is already saved. */
  function draftLines() {
    var out = [];
    data.draft.selected.forEach(function (s) {
      var it = itemById(s.itemId);
      if (!it) { return; }
      if (!(s.amount > 0)) { return; }
      out.push({
        name: it.name,
        unit: it.unit,
        qty: Fmt.round(s.qty, 3),
        rate: Fmt.round(s.rate, 2),
        amount: Fmt.round(s.amount, 2),
        detail: String(s.detail || '').trim()
      });
    });
    return out;
  }

  function draftSubtotal() {
    return Fmt.round(data.draft.selected.reduce(function (s, l) {
      return s + (l.amount > 0 ? l.amount : 0);
    }, 0), 2);
  }

  function draftTotal() {
    return Math.max(0, Fmt.round(draftSubtotal() - Fmt.num(data.draft.discount), 2));
  }

  function nextNumberString() {
    return (data.business.invoicePrefix || '') + data.business.nextNumber;
  }

  function resetDraft() {
    data.draft = Store.newDraft(data.business);
    persist(true);
  }

  /* Advance the counter past whatever number the user actually typed. */
  function advanceNumber(used) {
    var m = String(used).match(/(\d+)\s*$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (isFinite(n) && n >= data.business.nextNumber) {
        data.business.nextNumber = n + 1;
      }
    }
  }

  function saveInvoice() {
    var lines = draftLines();
    if (!lines.length) { return null; }
    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    var discount = Math.min(Fmt.num(data.draft.discount), subtotal);
    var number = String(data.draft.number || '').trim() || nextNumberString();
    var inv = {
      id: Store.uid('in_'),
      number: number,
      date: data.draft.date || Store.todayISO(),
      partyId: data.draft.partyId || null,
      lines: lines,
      discount: Fmt.round(discount, 2),
      total: Fmt.round(subtotal - discount, 2),
      status: data.draft.status === 'on-account' ? 'on-account' : 'received',
      createdAt: Date.now()
    };
    data.invoices.push(inv);
    advanceNumber(number);
    resetDraft();
    persist(true);
    changed('invoices');
    return inv;
  }

  function deleteInvoice(id) {
    data.invoices = data.invoices.filter(function (i) { return i.id !== id; });
    persist(true);
    changed('invoices');
  }

  function saveBusiness(patch) {
    Object.keys(patch).forEach(function (k) { data.business[k] = patch[k]; });
    persist(true);
    changed('business');
  }

  function replaceAll(next) {
    data = next;
    persist(true);
    changed('all');
  }

  return {
    init: init, get: get, business: business, draft: draft, persist: persist,
    onChange: onChange, changed: changed,
    itemById: itemById, partyById: partyById, partyName: partyName, invoiceById: invoiceById,
    itemsSorted: itemsSorted, partiesSorted: partiesSorted, invoicesSorted: invoicesSorted,
    addItem: addItem, updateItem: updateItem, deleteItem: deleteItem,
    addParty: addParty, updateParty: updateParty, deleteParty: deleteParty,
    invoicesFor: invoicesFor, paymentsFor: paymentsFor, paidTotal: paidTotal,
    billedOnAccount: billedOnAccount, outstanding: outstanding, totalOutstanding: totalOutstanding,
    allocation: allocation, addPayment: addPayment, deletePayment: deletePayment,
    selectedFor: selectedFor, isSelected: isSelected, select: select, deselect: deselect,
    setQty: setQty, setRate: setRate, setAmount: setAmount, setDetail: setDetail, setDraft: setDraft,
    draftLines: draftLines, draftSubtotal: draftSubtotal, draftTotal: draftTotal,
    nextNumberString: nextNumberString, resetDraft: resetDraft,
    saveInvoice: saveInvoice, deleteInvoice: deleteInvoice,
    saveBusiness: saveBusiness, replaceAll: replaceAll
  };
})();
