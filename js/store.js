/* store.js — localStorage read/write, schema defaults, export & import.
   Everything here is defensive: the app must render with empty,
   corrupt, or completely unavailable storage. */
var Store = (function () {
  'use strict';

  var KEY = 'shaheen_traders_v1';
  var UNITS = ['kg', 'dozen', 'piece', 'bundle', 'crate', 'bag', 'litre', 'maund'];

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function uid(prefix) {
    return (prefix || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function newDraft(business) {
    var b = business || {};
    return {
      number: (b.invoicePrefix || '') + (b.nextNumber == null ? '' : b.nextNumber),
      date: todayISO(),
      partyId: null,
      selected: [],          /* [{ itemId, qty, rate, amount, detail }] */
      discount: 0,
      status: 'received'
    };
  }

  /* The real business, so a fresh install is ready to bill. These are only
     ever a floor: normalize() puts them *underneath* whatever is already
     stored, so a value the user has saved — including one they cleared on
     purpose — is never written over. */
  function defaultBusiness() {
    return {
      name: 'Shaheen Traders',
      ntn: '5286966-6',
      strn: '',
      phone: '03086701790',
      email: '',
      address: 'Shaheen Traders, Air Base, Sargodha',
      signature: 'zafar',
      invoicePrefix: '',
      nextNumber: 81
    };
  }

  function defaults() {
    var b = defaultBusiness();
    return { business: b, items: [], parties: [], invoices: [], payments: [], draft: newDraft(b) };
  }

  function str(v, fallback) { return typeof v === 'string' ? v : (fallback || ''); }
  function n(v, fallback) { var x = parseFloat(v); return isFinite(x) ? x : (fallback || 0); }
  function arr(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }

  /* Bring anything we read off disk up to the current shape. Missing keys get
     defaults, wrong types get dropped — never throw on someone else's JSON. */
  function normalize(raw) {
    var d = defaults();
    if (!raw || typeof raw !== 'object') { return d; }

    var rb = raw.business && typeof raw.business === 'object' ? raw.business : {};
    var b = {
      name: str(rb.name, d.business.name),
      ntn: str(rb.ntn, d.business.ntn),
      strn: str(rb.strn, d.business.strn),
      phone: str(rb.phone, d.business.phone),
      email: str(rb.email, d.business.email),
      address: str(rb.address, d.business.address),
      signature: str(rb.signature, d.business.signature),
      invoicePrefix: typeof rb.invoicePrefix === 'string' ? rb.invoicePrefix : d.business.invoicePrefix,
      nextNumber: Math.max(1, Math.round(n(rb.nextNumber, d.business.nextNumber)))
    };

    var items = arr(raw.items).map(function (it) {
      if (!it || typeof it !== 'object') { return null; }
      var unit = UNITS.indexOf(it.unit) >= 0 ? it.unit : 'kg';
      var name = str(it.name).trim();
      if (!name) { return null; }
      return {
        id: str(it.id) || uid('it_'),
        name: name,
        unit: unit,
        defaultRate: n(it.defaultRate),
        createdAt: n(it.createdAt, Date.now())
      };
    }).filter(Boolean);

    var parties = arr(raw.parties).map(function (p) {
      if (!p || typeof p !== 'object') { return null; }
      var name = str(p.name).trim();
      if (!name) { return null; }
      /* deliberately no ntn / strn on a party — the buyer's tax numbers
         are never captured and never printed */
      return {
        id: str(p.id) || uid('pt_'),
        name: name,
        phone: str(p.phone),
        address: str(p.address),
        createdAt: n(p.createdAt, Date.now())
      };
    }).filter(Boolean);

    var invoices = arr(raw.invoices).map(function (inv) {
      if (!inv || typeof inv !== 'object') { return null; }
      var lines = arr(inv.lines).map(function (l) {
        if (!l || typeof l !== 'object') { return null; }
        return {
          name: str(l.name),
          unit: str(l.unit),
          qty: n(l.qty),
          rate: n(l.rate),
          amount: n(l.amount),
          detail: str(l.detail)
        };
      }).filter(Boolean);
      if (!lines.length) { return null; }
      return {
        id: str(inv.id) || uid('in_'),
        number: str(inv.number),
        date: str(inv.date, todayISO()),
        partyId: str(inv.partyId) || null,
        lines: lines,
        discount: n(inv.discount),
        total: n(inv.total),
        status: inv.status === 'on-account' ? 'on-account' : 'received',
        createdAt: n(inv.createdAt, Date.now())
      };
    }).filter(Boolean);

    var payments = arr(raw.payments).map(function (p) {
      if (!p || typeof p !== 'object' || !str(p.partyId)) { return null; }
      return {
        id: str(p.id) || uid('pm_'),
        partyId: str(p.partyId),
        amount: n(p.amount),
        date: str(p.date, todayISO())
      };
    }).filter(Boolean);

    var rd = raw.draft && typeof raw.draft === 'object' ? raw.draft : {};
    var known = {};
    items.forEach(function (it) { known[it.id] = true; });
    var draft = {
      number: str(rd.number, b.invoicePrefix + b.nextNumber),
      date: str(rd.date, todayISO()),
      partyId: str(rd.partyId) || null,
      selected: arr(rd.selected).map(function (s) {
        if (!s || typeof s !== 'object' || !known[s.itemId]) { return null; }
        return {
          itemId: s.itemId,
          unit: UNITS.indexOf(s.unit) >= 0 ? s.unit : '',
          qty: n(s.qty),
          rate: n(s.rate),
          amount: n(s.amount),
          detail: str(s.detail)
        };
      }).filter(Boolean),
      discount: n(rd.discount),
      status: rd.status === 'on-account' ? 'on-account' : 'received'
    };
    if (draft.partyId && !parties.some(function (p) { return p.id === draft.partyId; })) {
      draft.partyId = null;
    }

    return { business: b, items: items, parties: parties, invoices: invoices, payments: payments, draft: draft };
  }

  function available() {
    try {
      var probe = KEY + '__probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { return defaults(); }
      return normalize(JSON.parse(raw));
    } catch (e) {
      /* corrupt or blocked storage — carry on with an empty book */
      return defaults();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function exportJSON(data) {
    return JSON.stringify({
      app: 'shaheen-traders',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: data
    }, null, 2);
  }

  /* Accepts either a wrapped backup or a bare store object. */
  function importJSON(text) {
    var parsed = JSON.parse(text);
    var body = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!body || typeof body !== 'object') { throw new Error('Not a backup file'); }
    if (!body.business && !body.items && !body.invoices && !body.parties) {
      throw new Error('Not a Shaheen Traders backup');
    }
    return normalize(body);
  }

  return {
    KEY: KEY,
    UNITS: UNITS,
    defaults: defaults,
    newDraft: newDraft,
    normalize: normalize,
    todayISO: todayISO,
    uid: uid,
    available: available,
    load: load,
    save: save,
    exportJSON: exportJSON,
    importJSON: importJSON
  };
})();
