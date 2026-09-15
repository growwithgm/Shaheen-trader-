/* ui-items.js — the item master. The app ships with an empty list; every
   item on it was typed by the trader. */
var UIItems = (function () {
  'use strict';

  var host, empty, count;

  function refresh() {
    if (!host) { return; }
    host.textContent = '';
    var items = State.itemsSorted();
    items.forEach(function (it) { host.appendChild(row(it)); });
    empty.classList.toggle('hidden', items.length > 0);
    host.classList.toggle('hidden', items.length === 0);
    count.textContent = items.length ? items.length + (items.length === 1 ? ' item' : ' items') : '';
  }

  function row(item) {
    var b = App.h('button', 'rowbtn');
    b.type = 'button';
    var t = App.h('div', 'rowbtn-t');
    t.appendChild(App.h('div', 'rowbtn-name', item.name));
    t.appendChild(App.h('div', 'rowbtn-sub', 'per ' + item.unit));
    b.appendChild(t);
    var a = App.h('div', 'rowbtn-amt');
    a.appendChild(App.h('b', 'num', item.defaultRate ? 'Rs ' + Fmt.group(item.defaultRate, 2) : '—'));
    a.appendChild(App.h('span', '', item.defaultRate ? 'default rate' : 'no default rate'));
    b.appendChild(a);
    b.addEventListener('click', function () { openForm(item); });
    return b;
  }

  /* Used by both the Items tab and the Bill tab. onSaved is called with the
     item so the Bill tab can drop it straight onto the invoice. */
  function openForm(item, onSaved) {
    var editing = !!item;
    var body = App.h('div');

    var nameWrap = App.h('div', 'formrow');
    nameWrap.appendChild(App.h('span', 'lab', 'Item name'));
    var name = App.h('input');
    name.type = 'text';
    name.autocomplete = 'off';
    name.placeholder = 'e.g. Potato';
    name.value = editing ? item.name : '';
    nameWrap.appendChild(name);
    body.appendChild(nameWrap);

    var two = App.h('div', 'formrow');
    var grid = App.h('div', 'form2');

    var unitCell = App.h('div');
    unitCell.appendChild(App.h('div', 'lab', 'Unit'));
    var unit = App.h('select');
    Store.UNITS.forEach(function (u) {
      var o = document.createElement('option');
      o.value = u; o.textContent = u;
      unit.appendChild(o);
    });
    unit.value = editing ? item.unit : 'kg';
    unitCell.appendChild(unit);

    var rateCell = App.h('div');
    rateCell.appendChild(App.h('div', 'lab', 'Default rate'));
    var rate = App.h('input', 'num');
    rate.type = 'text';
    rate.inputMode = 'decimal';
    rate.placeholder = '0';
    rate.value = editing && item.defaultRate ? Fmt.plain(item.defaultRate, 2) : '';
    rateCell.appendChild(rate);

    grid.appendChild(unitCell);
    grid.appendChild(rateCell);
    two.appendChild(grid);
    body.appendChild(two);

    body.appendChild(App.h('p', 'sheetnote',
      'The rate is only a starting point — it stays editable on every invoice line.'));

    var pad = App.h('div', 'actionpad');
    var save = App.h('button', 'btn btn-solid', editing ? 'Save changes' : 'Save item');
    save.type = 'button';
    pad.appendChild(save);
    body.appendChild(pad);

    if (editing) {
      var pad2 = App.h('div', 'actionpad');
      var del = App.h('button', 'btn btn-danger', 'Delete item');
      del.type = 'button';
      del.addEventListener('click', function () {
        App.confirm('Delete “' + item.name + '”?',
          'Invoices already saved keep their own copy of the name and rate, so they are not affected.',
          function () {
            State.deleteItem(item.id);
            App.sheet.close();
            refresh();
            UIBill.refresh();
            App.toast('Item deleted');
          });
      });
      pad2.appendChild(del);
      body.appendChild(pad2);
    }

    function commit() {
      var n = name.value.trim();
      if (!n) { name.focus(); App.toast('Give the item a name'); return; }
      var saved = editing
        ? State.updateItem(item.id, n, unit.value, Fmt.num(rate.value))
        : State.addItem(n, unit.value, Fmt.num(rate.value));
      App.sheet.close();
      refresh();
      UIBill.refresh();
      App.toast(editing ? 'Item updated' : 'Item saved');
      if (onSaved) { onSaved(saved); }
    }

    save.addEventListener('click', commit);
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });
    rate.addEventListener('keydown', function (e) { if (e.key === 'Enter') { commit(); } });

    App.sheet.open(editing ? 'Edit item' : 'New item', body);
    if (!editing) { setTimeout(function () { name.focus(); }, 60); }
  }

  function mount() {
    host = document.getElementById('masterList');
    empty = document.getElementById('masterEmpty');
    count = document.getElementById('itemsCount');
    document.getElementById('itemsAdd').addEventListener('click', function () { openForm(null); });
    refresh();
  }

  return { mount: mount, refresh: refresh, openForm: openForm };
})();
