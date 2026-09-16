/* ui-setup.js — business details, and the backup that is the only way
   data survives a cleared browser or a new phone. */
var UISetup = (function () {
  'use strict';

  var f = {};

  function load() {
    var b = State.business();
    f.name.value = b.name;
    f.phone.value = b.phone;
    f.email.value = b.email;
    f.address.value = b.address;
    f.ntn.value = b.ntn;
    f.strn.value = b.strn;
    f.signature.value = b.signature;
    f.prefix.value = b.invoicePrefix;
    f.next.value = String(b.nextNumber);
  }

  function save() {
    var nextRaw = parseInt(String(f.next.value).replace(/[^0-9]/g, ''), 10);
    State.saveBusiness({
      name: f.name.value.trim() || 'Shaheen Traders',
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      address: f.address.value.trim(),
      ntn: f.ntn.value.trim(),
      strn: f.strn.value.trim(),
      signature: f.signature.value.trim(),
      invoicePrefix: f.prefix.value.trim(),
      nextNumber: isFinite(nextRaw) && nextRaw > 0 ? nextRaw : State.business().nextNumber
    });
    App.paintHeader();
    /* an untouched draft should pick up the new numbering straight away */
    var d = State.draft();
    if (!d.selected.length) {
      State.setDraft({ number: State.nextNumberString() });
      UIBill.refreshBand();
    }
    load();
    App.toast('Business details saved');
  }

  function backup() {
    var text = Store.exportJSON(State.get());
    var name = 'shaheen-traders-backup-' + Store.todayISO() + '.json';
    try {
      var blob = new Blob([text], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      App.toast('Backup downloaded');
    } catch (e) {
      App.toast('Could not create the file on this browser');
    }
  }

  function restore(file) {
    if (!file) { return; }
    var reader = new FileReader();
    reader.onload = function () {
      var next;
      try {
        next = Store.importJSON(String(reader.result));
      } catch (e) {
        App.toast('That file is not a Shaheen Traders backup');
        return;
      }
      App.confirm('Restore this backup?',
        next.items.length + ' items, ' + next.parties.length + ' parties and ' +
        next.invoices.length + ' invoices will replace everything currently on this device.',
        function () {
          State.replaceAll(next);
          App.refreshAll();
          load();
          App.toast('Backup restored');
        });
    };
    reader.onerror = function () { App.toast('Could not read that file'); };
    reader.readAsText(file);
  }

  function mount() {
    f.name = document.getElementById('suName');
    f.phone = document.getElementById('suPhone');
    f.email = document.getElementById('suEmail');
    f.address = document.getElementById('suAddress');
    f.ntn = document.getElementById('suNtn');
    f.strn = document.getElementById('suStrn');
    f.signature = document.getElementById('suSignature');
    f.prefix = document.getElementById('suPrefix');
    f.next = document.getElementById('suNext');

    document.getElementById('suSave').addEventListener('click', save);
    document.getElementById('suBackup').addEventListener('click', backup);

    var picker = document.getElementById('suRestoreFile');
    document.getElementById('suRestore').addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () {
      restore(picker.files && picker.files[0]);
      picker.value = '';
    });

    var note = document.getElementById('storageNote');
    note.textContent = Store.available()
      ? 'Saved in this browser’s storage on this device only. Nothing is uploaded anywhere.'
      : 'This browser is blocking storage, so nothing can be saved. Turn off private browsing to keep your records.';
    if (!Store.available()) { note.className = 'hint warn'; }

    load();
  }

  return { mount: mount, load: load };
})();
