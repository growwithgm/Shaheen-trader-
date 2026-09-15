/* ui-records.js — every saved invoice. Payment status lives here and
   nowhere else; it is never printed. */
var UIRecords = (function () {
  'use strict';

  var host, empty, search, elCount, elBilled, elReceived, elOutstanding;

  function refresh() {
    if (!host) { return; }
    var invoices = State.invoicesSorted();
    var q = (search.value || '').trim().toLowerCase();

    var shown = invoices.filter(function (inv) {
      if (!q) { return true; }
      return inv.number.toLowerCase().indexOf(q) >= 0 ||
             State.partyName(inv.partyId).toLowerCase().indexOf(q) >= 0;
    });

    host.textContent = '';
    shown.forEach(function (inv) { host.appendChild(row(inv)); });
    empty.classList.toggle('hidden', invoices.length > 0);
    host.classList.toggle('hidden', shown.length === 0);
    if (invoices.length && !shown.length) {
      var none = App.h('div', 'empty');
      none.appendChild(App.h('p', 'empty-d', 'No invoice matches that search.'));
      host.classList.remove('hidden');
      host.appendChild(none);
    }

    var billed = invoices.reduce(function (s, i) { return s + i.total; }, 0);
    var cash = invoices.reduce(function (s, i) { return s + (i.status === 'received' ? i.total : 0); }, 0);
    var paid = State.get().payments.reduce(function (s, p) { return s + p.amount; }, 0);

    elCount.textContent = String(invoices.length);
    elBilled.textContent = Fmt.money(billed);
    elReceived.textContent = Fmt.money(cash + paid);
    elOutstanding.textContent = Fmt.money(State.totalOutstanding());
  }

  function row(inv) {
    var wrap = App.h('div', 'recrow');

    var b = App.h('button', 'rowbtn');
    b.type = 'button';
    var t = App.h('div', 'rowbtn-t');
    t.appendChild(App.h('div', 'rowbtn-name', inv.number));
    t.appendChild(App.h('div', 'rowbtn-sub', Fmt.date(inv.date) + ' · ' + State.partyName(inv.partyId)));
    b.appendChild(t);
    var a = App.h('div', 'rowbtn-amt');
    a.appendChild(App.h('b', 'num', Fmt.money(inv.total)));
    a.appendChild(App.h('span', inv.status === 'received' ? 'recv' : 'owed',
      inv.status === 'received' ? 'Received' : 'On account'));
    b.appendChild(a);
    b.addEventListener('click', function () { Invoice.open(inv.id); });
    wrap.appendChild(b);

    var more = App.h('button', 'iconbtn rec-more', '⋯');
    more.type = 'button';
    more.setAttribute('aria-label', 'Invoice options');
    more.addEventListener('click', function () { openOptions(inv); });
    wrap.appendChild(more);

    return wrap;
  }

  function openOptions(inv) {
    var body = App.h('div');
    body.appendChild(App.h('p', 'sheetnote',
      Fmt.date(inv.date) + ' · ' + State.partyName(inv.partyId) + ' · ' + Fmt.money(inv.total) +
      ' · ' + (inv.status === 'received' ? 'cash received' : 'on account')));

    var pad = App.h('div', 'actionpad two');
    var open = App.h('button', 'btn btn-solid', 'Open invoice');
    open.type = 'button';
    open.addEventListener('click', function () { App.sheet.close(); Invoice.open(inv.id); });
    var flip = App.h('button', 'btn', inv.status === 'received' ? 'Mark on account' : 'Mark received');
    flip.type = 'button';
    flip.addEventListener('click', function () {
      inv.status = inv.status === 'received' ? 'on-account' : 'received';
      State.persist(true);
      App.sheet.close();
      refresh();
      UIParties.refresh();
      App.toast('Status updated');
    });
    pad.appendChild(open); pad.appendChild(flip);
    body.appendChild(pad);

    var pad2 = App.h('div', 'actionpad');
    var del = App.h('button', 'btn btn-danger', 'Delete invoice');
    del.type = 'button';
    del.addEventListener('click', function () {
      App.confirm('Delete invoice ' + inv.number + '?',
        'It is removed from the records and from the party’s outstanding balance.',
        function () {
          State.deleteInvoice(inv.id);
          App.sheet.close();
          refresh();
          UIParties.refresh();
          App.toast('Invoice deleted');
        });
    });
    pad2.appendChild(del);
    body.appendChild(pad2);

    App.sheet.open('Invoice ' + inv.number, body);
  }

  function mount() {
    host = document.getElementById('recList');
    empty = document.getElementById('recEmpty');
    search = document.getElementById('recSearch');
    elCount = document.getElementById('recCount');
    elBilled = document.getElementById('recBilled');
    elReceived = document.getElementById('recReceived');
    elOutstanding = document.getElementById('recOutstanding');
    search.addEventListener('input', refresh);
    refresh();
  }

  return { mount: mount, refresh: refresh };
})();
