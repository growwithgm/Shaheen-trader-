/* app.js — boot, tab navigation, sheets, confirmations, toasts. */
var App = (function () {
  'use strict';

  var currentTab = 'bill';
  var toastTimer = null;

  /* ---------------- tiny DOM helper ---------------- */

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text != null && text !== '') { el.textContent = text; }
    return el;
  }

  /* ---------------- toast ---------------- */

  function toast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    if (toastTimer) { clearTimeout(toastTimer); }
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2400);
  }

  /* ---------------- sheet ---------------- */

  var sheet = (function () {
    function open(title, node) {
      var wrap = document.getElementById('sheetWrap');
      document.getElementById('sheetTitle').textContent = title || '';
      var body = document.getElementById('sheetBody');
      body.textContent = '';
      body.appendChild(node);
      body.scrollTop = 0;
      wrap.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      document.getElementById('sheetWrap').classList.add('hidden');
      document.getElementById('sheetBody').textContent = '';
      if (!Invoice.isOpen()) { document.body.style.overflow = ''; }
    }
    function isOpen() { return !document.getElementById('sheetWrap').classList.contains('hidden'); }
    return { open: open, close: close, isOpen: isOpen };
  })();

  /* A second-level dialog, so a confirmation never destroys the sheet
     the user opened it from. */
  function confirmDialog(title, message, onYes) {
    var wrap = h('div', 'sheetwrap');
    wrap.style.zIndex = '80';
    var scrim = h('div', 'sheet-scrim');
    var panel = h('div', 'sheet');

    var head = h('div', 'sheet-head');
    head.appendChild(h('h2', 'sheet-title', title));
    var x = h('button', 'sheet-x', '✕');
    x.type = 'button';
    head.appendChild(x);
    panel.appendChild(head);

    var body = h('div', 'sheet-body');
    if (message) { body.appendChild(h('p', 'sheetnote', message)); }
    var pad = h('div', 'actionpad two');
    var no = h('button', 'btn btn-ghost', 'Cancel');
    no.type = 'button';
    var yes = h('button', 'btn btn-danger', 'Yes, continue');
    yes.type = 'button';
    pad.appendChild(no);
    pad.appendChild(yes);
    body.appendChild(pad);
    panel.appendChild(body);

    wrap.appendChild(scrim);
    wrap.appendChild(panel);
    document.body.appendChild(wrap);

    function done() { if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); } }
    no.addEventListener('click', done);
    x.addEventListener('click', done);
    scrim.addEventListener('click', done);
    yes.addEventListener('click', function () { done(); onYes(); });
  }

  /* ---------------- tabs ---------------- */

  var PANES = ['bill', 'items', 'parties', 'records', 'setup'];

  function show(tab) {
    PANES.forEach(function (p) {
      document.getElementById('pane-' + p).classList.toggle('hidden', p !== tab);
    });
    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-on', tabs[i].getAttribute('data-tab') === tab);
    }
    document.getElementById('totalBar').classList.toggle('hidden', tab !== 'bill');
    if (tab !== 'setup') { currentTab = tab; }
    if (tab === 'items') { UIItems.refresh(); }
    if (tab === 'parties') { UIParties.refresh(); }
    if (tab === 'records') { UIRecords.refresh(); }
    if (tab === 'setup') { UISetup.load(); }
    window.scrollTo(0, 0);
  }

  function paintHeader() {
    var b = State.business();
    document.getElementById('hdrName').textContent = b.name || 'Shaheen Traders';
    var sub = (b.address || '').split('\n')[0].trim();
    document.getElementById('hdrSub').textContent = sub || 'Invoicing';
  }

  function refreshAll() {
    UIBill.refresh();
    UIItems.refresh();
    UIParties.refresh();
    UIRecords.refresh();
    paintHeader();
  }

  /* ---------------- service worker ---------------- */

  function registerSW() {
    try {
      if (!('serviceWorker' in navigator)) { return; }
      if (location.protocol !== 'http:' && location.protocol !== 'https:') { return; }
      navigator.serviceWorker.register('./sw.js', { scope: './' })['catch'](function () { /* offline support is a bonus, never a blocker */ });
    } catch (e) { /* ignore */ }
  }

  /* ---------------- boot ---------------- */

  function boot() {
    State.init();

    Invoice.mount();
    UIBill.mount();
    UIItems.mount();
    UIParties.mount();
    UIRecords.mount();
    UISetup.mount();

    paintHeader();

    var tabs = document.querySelectorAll('#tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () { show(btn.getAttribute('data-tab')); });
      })(tabs[i]);
    }

    document.getElementById('setupBtn').addEventListener('click', function () {
      var onSetup = !document.getElementById('pane-setup').classList.contains('hidden');
      show(onSetup ? currentTab : 'setup');
    });

    document.getElementById('sheetScrim').addEventListener('click', sheet.close);
    document.getElementById('sheetClose').addEventListener('click', sheet.close);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') { return; }
      if (sheet.isOpen()) { sheet.close(); }
      else if (Invoice.isOpen()) { Invoice.close(); }
    });

    show('bill');
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    /* defer one tick so the App object exists before any view touches it */
    setTimeout(boot, 0);
  }

  return { h: h, toast: toast, sheet: sheet, confirm: confirmDialog, show: show, paintHeader: paintHeader, refreshAll: refreshAll };
})();
