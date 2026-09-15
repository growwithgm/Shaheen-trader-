/* ui-parties.js — buyers, what they owe, and the payments they make.
   A party has no NTN or STRN: the buyer's tax numbers are never collected
   and never printed. */
var UIParties = (function () {
  'use strict';

  var host, empty, totalEl;

  function refresh() {
    if (!host) { return; }
    host.textContent = '';
    var parties = State.partiesSorted();
    parties.forEach(function (p) { host.appendChild(row(p)); });
    empty.classList.toggle('hidden', parties.length > 0);
    host.classList.toggle('hidden', parties.length === 0);
    totalEl.textContent = Fmt.money(State.totalOutstanding());
    UIBill.refreshBand();
  }

  function row(p) {
    var out = State.outstanding(p.id);
    var b = App.h('button', 'rowbtn');
    b.type = 'button';
    var t = App.h('div', 'rowbtn-t');
    t.appendChild(App.h('div', 'rowbtn-name', p.name));
    t.appendChild(App.h('div', 'rowbtn-sub', p.phone || p.address || '—'));
    b.appendChild(t);
    var a = App.h('div', 'rowbtn-amt');
    if (out > 0) {
      a.appendChild(App.h('b', 'num owed', Fmt.money(out)));
      a.appendChild(App.h('span', '', 'outstanding'));
    } else {
      a.appendChild(App.h('b', 'num recv', 'Clear'));
      a.appendChild(App.h('span', '', 'nothing due'));
    }
    b.appendChild(a);
    b.addEventListener('click', function () { openParty(p.id); });
    return b;
  }

  function openParty(id) {
    var p = State.partyById(id);
    if (!p) { return; }
    var out = State.outstanding(id);
    var body = App.h('div');

    var band = App.h('div', 'statband');
    band.appendChild(App.h('span', 'stat-l', 'Outstanding'));
    band.appendChild(App.h('span', 'stat-v num ' + (out > 0 ? 'owed' : 'recv'), out > 0 ? Fmt.money(out) : 'Clear'));
    body.appendChild(band);

    if (p.phone || p.address) {
      var info = App.h('p', 'sheetnote', [p.phone, p.address].filter(Boolean).join(' · '));
      body.appendChild(info);
    }

    var pad = App.h('div', 'actionpad two');
    var pay = App.h('button', 'btn btn-solid', 'Record payment');
    pay.type = 'button';
    pay.addEventListener('click', function () { openPayment(p); });
    var edit = App.h('button', 'btn', 'Edit details');
    edit.type = 'button';
    edit.addEventListener('click', function () { openForm(p); });
    pad.appendChild(pay); pad.appendChild(edit);
    body.appendChild(pad);

    /* what is still open, oldest first */
    var alloc = State.allocation(id).filter(function (a) { return a.due > 0.004; });
    if (alloc.length) {
      body.appendChild(App.h('div', 'sechead', 'Open invoices'));
      var list = App.h('div', 'itemlist');
      alloc.forEach(function (a) {
        var b = App.h('button', 'rowbtn');
        b.type = 'button';
        var t = App.h('div', 'rowbtn-t');
        t.appendChild(App.h('div', 'rowbtn-name', a.invoice.number));
        t.appendChild(App.h('div', 'rowbtn-sub', Fmt.date(a.invoice.date) +
          (a.paid > 0 ? ' · part paid ' + Fmt.money(a.paid) : '')));
        b.appendChild(t);
        var amt = App.h('div', 'rowbtn-amt');
        amt.appendChild(App.h('b', 'num owed', Fmt.money(a.due)));
        amt.appendChild(App.h('span', '', 'due'));
        b.appendChild(amt);
        b.addEventListener('click', function () { App.sheet.close(); Invoice.open(a.invoice.id); });
        list.appendChild(b);
      });
      body.appendChild(list);
    }

    var pays = State.paymentsFor(id).slice().reverse();
    if (pays.length) {
      body.appendChild(App.h('div', 'sechead', 'Payments received'));
      var plist = App.h('div', 'itemlist');
      pays.forEach(function (pm) {
        var r = App.h('div', 'rowbtn');
        var t = App.h('div', 'rowbtn-t');
        t.appendChild(App.h('div', 'rowbtn-name', Fmt.money(pm.amount)));
        t.appendChild(App.h('div', 'rowbtn-sub', Fmt.date(pm.date)));
        r.appendChild(t);
        var x = App.h('button', 'btn btn-ghost', 'Remove');
        x.type = 'button';
        x.style.flex = '0 0 auto';
        x.style.minHeight = '40px';
        x.addEventListener('click', function () {
          App.confirm('Remove this payment?', Fmt.money(pm.amount) + ' received on ' + Fmt.date(pm.date) + '.', function () {
            State.deletePayment(pm.id);
            refresh();
            UIRecords.refresh();
            App.sheet.close();
            App.toast('Payment removed');
          });
        });
        r.appendChild(x);
        plist.appendChild(r);
      });
      body.appendChild(plist);
    }

    if (!alloc.length && !pays.length) {
      body.appendChild(App.h('p', 'sheetnote', 'No invoices on account and no payments yet for this party.'));
    }

    App.sheet.open(p.name, body);
  }

  function openPayment(p) {
    var body = App.h('div');
    var out = State.outstanding(p.id);

    body.appendChild(App.h('p', 'sheetnote',
      out > 0 ? 'Outstanding right now: ' + Fmt.money(out) + '. Payments settle the oldest open invoice first.'
              : 'Nothing is outstanding for this party at the moment.'));

    var aw = App.h('div', 'formrow');
    aw.appendChild(App.h('span', 'lab', 'Amount received'));
    var amount = App.h('input', 'num');
    amount.type = 'text';
    amount.inputMode = 'decimal';
    amount.placeholder = '0';
    aw.appendChild(amount);
    body.appendChild(aw);

    if (out > 0) {
      var chips = App.h('div', 'chips');
      var full = App.h('button', 'chip', 'Full ' + Fmt.money(out));
      full.type = 'button';
      full.addEventListener('click', function () { amount.value = Fmt.plain(out, 2); amount.focus(); });
      chips.appendChild(full);
      body.appendChild(chips);
    }

    var dw = App.h('div', 'formrow');
    dw.appendChild(App.h('span', 'lab', 'Date'));
    var date = App.h('input', 'num');
    date.type = 'date';
    date.value = Store.todayISO();
    dw.appendChild(date);
    body.appendChild(dw);

    var pad = App.h('div', 'actionpad');
    var save = App.h('button', 'btn btn-solid', 'Record payment');
    save.type = 'button';
    save.addEventListener('click', function () {
      var v = Fmt.num(amount.value);
      if (!(v > 0)) { amount.focus(); App.toast('Enter an amount'); return; }
      State.addPayment(p.id, v, date.value || Store.todayISO());
      App.sheet.close();
      refresh();
      UIRecords.refresh();
      App.toast(Fmt.money(v) + ' recorded');
    });
    pad.appendChild(save);
    body.appendChild(pad);

    App.sheet.open('Payment · ' + p.name, body);
    setTimeout(function () { amount.focus(); }, 60);
  }

  function openForm(party, onSaved) {
    var editing = !!party;
    var body = App.h('div');

    var nw = App.h('div', 'formrow');
    nw.appendChild(App.h('span', 'lab', 'Party name'));
    var name = App.h('input');
    name.type = 'text';
    name.placeholder = 'e.g. Al-Madina Hotel';
    name.value = editing ? party.name : '';
    nw.appendChild(name);
    body.appendChild(nw);

    var pw = App.h('div', 'formrow');
    pw.appendChild(App.h('span', 'lab', 'Phone'));
    var phone = App.h('input', 'num');
    phone.type = 'tel';
    phone.inputMode = 'tel';
    phone.placeholder = 'optional';
    phone.value = editing ? party.phone : '';
    pw.appendChild(phone);
    body.appendChild(pw);

    var aw = App.h('div', 'formrow');
    aw.appendChild(App.h('span', 'lab', 'Address'));
    var address = App.h('textarea');
    address.rows = 2;
    address.placeholder = 'optional';
    address.value = editing ? party.address : '';
    aw.appendChild(address);
    body.appendChild(aw);

    body.appendChild(App.h('p', 'sheetnote',
      'Only your own NTN is printed on an invoice, so a buyer’s tax numbers are not kept here.'));

    var pad = App.h('div', 'actionpad');
    var save = App.h('button', 'btn btn-solid', editing ? 'Save changes' : 'Save party');
    save.type = 'button';
    pad.appendChild(save);
    body.appendChild(pad);

    if (editing) {
      var pad2 = App.h('div', 'actionpad');
      var del = App.h('button', 'btn btn-danger', 'Delete party');
      del.type = 'button';
      del.addEventListener('click', function () {
        App.confirm('Delete “' + party.name + '”?',
          'Their payments are removed too. Invoices already saved stay in Records, marked as a cash customer.',
          function () {
            State.deleteParty(party.id);
            App.sheet.close();
            refresh();
            UIRecords.refresh();
            App.toast('Party deleted');
          });
      });
      pad2.appendChild(del);
      body.appendChild(pad2);
    }

    function commit() {
      var n = name.value.trim();
      if (!n) { name.focus(); App.toast('Give the party a name'); return; }
      var saved = editing
        ? State.updateParty(party.id, n, phone.value, address.value)
        : State.addParty(n, phone.value, address.value);
      App.sheet.close();
      refresh();
      UIRecords.refresh();
      App.toast(editing ? 'Party updated' : 'Party saved');
      if (onSaved) { onSaved(saved); }
    }

    save.addEventListener('click', commit);
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });

    App.sheet.open(editing ? 'Edit party' : 'New party', body);
    if (!editing) { setTimeout(function () { name.focus(); }, 60); }
  }

  function mount() {
    host = document.getElementById('partyList');
    empty = document.getElementById('partyEmpty');
    totalEl = document.getElementById('totalOutstanding');
    document.getElementById('partiesAdd').addEventListener('click', function () { openForm(null); });
    refresh();
  }

  return { mount: mount, refresh: refresh, openForm: openForm, openParty: openParty };
})();
