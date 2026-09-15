/* catalogue.js — a suggestion dictionary of produce sold in Pakistan.
   It is NOT the item master: nothing here is shown as a list, nothing here
   carries a rate, and nothing here exists in the user's book until they tap
   a suggestion. It only ever surfaces through the search box. */
var Catalogue = (function () {
  'use strict';

  var ITEMS = [
    /* ---- vegetables ---- */
    { name: 'Potato', unit: 'kg', aliases: ['aloo', 'potato'] },
    { name: 'Onion', unit: 'kg', aliases: ['pyaz', 'piyaz', 'onion'] },
    { name: 'Tomato', unit: 'kg', aliases: ['tamatar', 'tomato'] },
    { name: 'Garlic', unit: 'kg', aliases: ['lehsan', 'lasan', 'garlic'] },
    { name: 'Ginger', unit: 'kg', aliases: ['adrak', 'ginger'] },
    { name: 'Green Chilli', unit: 'kg', aliases: ['hari mirch', 'mirch', 'chilli'] },
    { name: 'Red Chilli', unit: 'kg', aliases: ['lal mirch', 'red chilli'] },
    { name: 'Capsicum', unit: 'kg', aliases: ['shimla mirch', 'bell pepper', 'capsicum'] },
    { name: 'Brinjal', unit: 'kg', aliases: ['baingan', 'eggplant', 'brinjal'] },
    { name: 'Okra', unit: 'kg', aliases: ['bhindi', 'okra', 'lady finger'] },
    { name: 'Cauliflower', unit: 'kg', aliases: ['phool gobhi', 'gobhi', 'cauliflower'] },
    { name: 'Cabbage', unit: 'kg', aliases: ['band gobhi', 'cabbage'] },
    { name: 'Carrot', unit: 'kg', aliases: ['gajar', 'carrot'] },
    { name: 'Radish', unit: 'kg', aliases: ['mooli', 'radish'] },
    { name: 'Turnip', unit: 'kg', aliases: ['shalgam', 'turnip'] },
    { name: 'Beetroot', unit: 'kg', aliases: ['chukandar', 'beetroot'] },
    { name: 'Spinach', unit: 'kg', aliases: ['palak', 'spinach'] },
    { name: 'Fenugreek Leaves', unit: 'kg', aliases: ['methi', 'fenugreek'] },
    { name: 'Mustard Leaves', unit: 'kg', aliases: ['sarson', 'saag', 'mustard'] },
    { name: 'Coriander', unit: 'bundle', aliases: ['dhania', 'hara dhania', 'coriander'] },
    { name: 'Mint', unit: 'bundle', aliases: ['podina', 'pudina', 'mint'] },
    { name: 'Cucumber', unit: 'kg', aliases: ['kheera', 'khira', 'cucumber'] },
    { name: 'Bottle Gourd', unit: 'kg', aliases: ['lauki', 'kaddu', 'bottle gourd'] },
    { name: 'Ridge Gourd', unit: 'kg', aliases: ['tori', 'turai', 'ridge gourd'] },
    { name: 'Bitter Gourd', unit: 'kg', aliases: ['karela', 'bitter gourd'] },
    { name: 'Pumpkin', unit: 'kg', aliases: ['halwa kaddu', 'pumpkin'] },
    { name: 'Tinda', unit: 'kg', aliases: ['tinda', 'round gourd'] },
    { name: 'Green Peas', unit: 'kg', aliases: ['matar', 'mutter', 'peas'] },
    { name: 'Green Beans', unit: 'kg', aliases: ['phali', 'beans'] },
    { name: 'Sweet Potato', unit: 'kg', aliases: ['shakarqandi', 'sweet potato'] },
    { name: 'Arvi', unit: 'kg', aliases: ['arvi', 'arbi', 'colocasia'] },
    { name: 'Lemon', unit: 'kg', aliases: ['nimbu', 'lemon'] },
    { name: 'Lettuce', unit: 'kg', aliases: ['salad patta', 'lettuce'] },
    { name: 'Spring Onion', unit: 'bundle', aliases: ['hara pyaz', 'spring onion'] },
    { name: 'Corn', unit: 'dozen', aliases: ['bhutta', 'makai', 'corn'] },
    { name: 'Mushroom', unit: 'kg', aliases: ['khumbi', 'mushroom'] },
    { name: 'Curry Leaves', unit: 'bundle', aliases: ['kari patta', 'curry leaves'] },
    { name: 'Green Garlic', unit: 'bundle', aliases: ['hara lehsan', 'green garlic'] },
    { name: 'Zucchini', unit: 'kg', aliases: ['zucchini'] },
    { name: 'Broccoli', unit: 'kg', aliases: ['broccoli'] },
    { name: 'Celery', unit: 'kg', aliases: ['celery'] },
    { name: 'Drumstick', unit: 'kg', aliases: ['sohanjna', 'moringa', 'drumstick'] },
    { name: 'Yam', unit: 'kg', aliases: ['ratalu', 'yam'] },
    { name: 'Cluster Beans', unit: 'kg', aliases: ['guar phali', 'cluster beans'] },

    /* ---- fruits ---- */
    { name: 'Apple', unit: 'kg', aliases: ['seb', 'apple'] },
    { name: 'Banana', unit: 'dozen', aliases: ['kela', 'banana'] },
    { name: 'Mango', unit: 'kg', aliases: ['aam', 'mango'] },
    { name: 'Kinnow', unit: 'kg', aliases: ['kinnow', 'kinoo', 'orange'] },
    { name: 'Malta', unit: 'kg', aliases: ['malta', 'sweet orange'] },
    { name: 'Grapefruit', unit: 'kg', aliases: ['chakotra', 'grapefruit'] },
    { name: 'Grapes', unit: 'kg', aliases: ['angoor', 'grapes'] },
    { name: 'Guava', unit: 'kg', aliases: ['amrood', 'amrud', 'guava'] },
    { name: 'Pomegranate', unit: 'kg', aliases: ['anar', 'pomegranate'] },
    { name: 'Watermelon', unit: 'kg', aliases: ['tarbooz', 'watermelon'] },
    { name: 'Melon', unit: 'kg', aliases: ['kharbooza', 'melon'] },
    { name: 'Papaya', unit: 'kg', aliases: ['papita', 'papaya'] },
    { name: 'Pineapple', unit: 'piece', aliases: ['ananas', 'pineapple'] },
    { name: 'Peach', unit: 'kg', aliases: ['aaru', 'aru', 'peach'] },
    { name: 'Plum', unit: 'kg', aliases: ['aloo bukhara', 'plum'] },
    { name: 'Apricot', unit: 'kg', aliases: ['khubani', 'apricot'] },
    { name: 'Cherry', unit: 'kg', aliases: ['cherry'] },
    { name: 'Strawberry', unit: 'kg', aliases: ['strawberry'] },
    { name: 'Dates', unit: 'kg', aliases: ['khajoor', 'dates'] },
    { name: 'Pear', unit: 'kg', aliases: ['nashpati', 'pear'] },
    { name: 'Litchi', unit: 'kg', aliases: ['lichi', 'litchi'] },
    { name: 'Falsa', unit: 'kg', aliases: ['falsa'] },
    { name: 'Jamun', unit: 'kg', aliases: ['jamun', 'jaman'] },
    { name: 'Mulberry', unit: 'kg', aliases: ['shehtoot', 'toot', 'mulberry'] },
    { name: 'Loquat', unit: 'kg', aliases: ['loquat'] },
    { name: 'Custard Apple', unit: 'kg', aliases: ['sharifa', 'custard apple'] },
    { name: 'Chiku', unit: 'kg', aliases: ['chiku', 'sapodilla'] },
    { name: 'Persimmon', unit: 'kg', aliases: ['japani phal', 'amlok', 'persimmon'] },
    { name: 'Fig', unit: 'kg', aliases: ['anjeer', 'fig'] },
    { name: 'Coconut', unit: 'piece', aliases: ['nariyal', 'coconut'] },
    { name: 'Sugarcane', unit: 'kg', aliases: ['ganna', 'sugarcane'] },
    { name: 'Kiwi', unit: 'kg', aliases: ['kiwi'] },
    { name: 'Lime', unit: 'kg', aliases: ['kaghzi nimbu', 'lime'] },
    { name: 'Musk Melon', unit: 'kg', aliases: ['sarda', 'musk melon'] }
  ];

  var MAX = 8;

  /* every string an entry answers to, lower case */
  function terms(entry) {
    return [entry.name.toLowerCase()].concat(entry.aliases);
  }

  /* the English name leads, then a Roman Urdu word that starts the same way,
     then anything that merely contains the query; -1 means no match */
  function rank(entry, q) {
    var name = entry.name.toLowerCase();
    if (name.indexOf(q) === 0) { return 0; }
    var best = name.indexOf(q) > 0 ? 2 : -1;
    for (var i = 0; i < entry.aliases.length; i++) {
      var at = entry.aliases[i].indexOf(q);
      if (at === 0) { return 1; }
      if (at > 0 && best !== 2) { best = 3; }
    }
    return best;
  }

  /* Suggestions for a query, minus anything the user already has saved.
     `taken` is a map of lower-cased item names already in the master. */
  function search(query, taken) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) { return []; }
    var hits = [];
    for (var i = 0; i < ITEMS.length; i++) {
      var e = ITEMS[i];
      if (taken && taken[e.name.toLowerCase()]) { continue; }
      var r = rank(e, q);
      if (r >= 0) { hits.push({ entry: e, rank: r, at: i }); }
    }
    hits.sort(function (a, b) { return a.rank - b.rank || a.at - b.at; });
    return hits.slice(0, MAX).map(function (x) { return x.entry; });
  }

  /* So a saved item stays findable by the same Roman Urdu word that first
     surfaced it: "aloo" keeps finding Potato after it is in the master. */
  var byName = null;
  function aliasesFor(name) {
    if (!byName) {
      byName = {};
      ITEMS.forEach(function (e) { byName[e.name.toLowerCase()] = e.aliases; });
    }
    return byName[String(name || '').toLowerCase()] || [];
  }

  return { ITEMS: ITEMS, search: search, aliasesFor: aliasesFor, MAX: MAX };
})();
