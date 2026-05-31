/**
 * Shared i18n layer for all pages.
 * - language state (aiefs:lang) + getLang/setLang
 * - L(obj, field): per-field fallback for data.js _zh fields
 * - I18N dictionary + t(key) for static UI strings
 * - applyI18n(): replace [data-i18n] / [data-i18n-attr] in the DOM
 * - initLangToggle(): wire up the header 中/EN button on every page
 */
(function (global) {
  var LANG_KEY = 'aiefs:lang';

  function getLang() {
    try { return localStorage.getItem(LANG_KEY) === 'zh' ? 'zh' : 'en'; }
    catch (e) { return 'en'; }
  }
  function setLang(l) {
    try { localStorage.setItem(LANG_KEY, l === 'zh' ? 'zh' : 'en'); } catch (e) {}
  }

  // Per-field localized read: zh + has _zh → zh, else English.
  function L(obj, field) {
    if (!obj) return '';
    return (getLang() === 'zh' && obj[field + '_zh']) ? obj[field + '_zh'] : obj[field];
  }

  var I18N = {
    en: {
      'nav.contents': 'Contents',
      'nav.catalog': 'Catalog',
      'nav.roadmap': 'Roadmap',
      'nav.glossary': 'Glossary',
      'footer.tagline': '2026 · open source · free forever'
    },
    zh: {
      'nav.contents': '目录',
      'nav.catalog': '课程表',
      'nav.roadmap': '路线图',
      'nav.glossary': '术语表',
      'footer.tagline': '2026 · 开源 · 永久免费'
    }
  };

  function t(key) {
    var l = getLang();
    return (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
  }

  function applyI18n() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    // attribute form: data-i18n-attr="placeholder:search.lessons;title:foo.bar"
    var attrNodes = document.querySelectorAll('[data-i18n-attr]');
    for (var j = 0; j < attrNodes.length; j++) {
      var spec = attrNodes[j].getAttribute('data-i18n-attr');
      var pairs = spec.split(';');
      for (var k = 0; k < pairs.length; k++) {
        var kv = pairs[k].split(':');
        if (kv.length === 2) attrNodes[j].setAttribute(kv[0].trim(), t(kv[1].trim()));
      }
    }
    try { document.documentElement.setAttribute('lang', getLang()); } catch (e) {}
  }

  // Wire the header 中/EN button. onSwitch() runs after lang flips so each
  // page can re-render its data-driven lists / refetch content.
  function initLangToggle(onSwitch) {
    var btn = document.getElementById('langToggle');
    var label = document.getElementById('langLabel');
    function paint() { if (label) label.textContent = getLang() === 'zh' ? 'EN' : '中'; }
    paint();
    applyI18n();
    if (!btn) return;
    btn.addEventListener('click', function () {
      setLang(getLang() === 'zh' ? 'en' : 'zh');
      paint();
      applyI18n();
      if (typeof onSwitch === 'function') onSwitch();
    });
  }

  global.AIEFS_I18N = {
    getLang: getLang, setLang: setLang, L: L, t: t,
    applyI18n: applyI18n, initLangToggle: initLangToggle
  };
})(window);
