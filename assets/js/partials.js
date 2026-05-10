(function () {
  'use strict';

  // Map pathname prefixes to nav data-nav values
  var navMap = [
    { match: /^\/blog\//, key: 'blog' },
    { match: /^\/$/, key: 'home' }
  ];

  function setActiveLink(navEl) {
    var path = window.location.pathname;
    var activeKey = '';
    for (var i = 0; i < navMap.length; i++) {
      if (navMap[i].match.test(path)) {
        activeKey = navMap[i].key;
        break;
      }
    }
    if (!activeKey) return;
    var link = navEl.querySelector('[data-nav="' + activeKey + '"]');
    if (link) link.classList.add('nav-link--active');
  }

  function initToggle(navEl) {
    var toggle = navEl.querySelector('#nav-toggle');
    var links  = navEl.querySelector('#nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  function loadPartial(selector, url, callback) {
    var placeholder = document.querySelector(selector);
    if (!placeholder) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        placeholder.outerHTML = html;
        var inserted = document.querySelector(selector.replace('[data-partial]', '').trim()) ||
                       document.querySelector('nav.site-nav, footer.site-footer');
        if (callback) callback(inserted);
      })
      .catch(function (e) { console.warn('Partial load failed:', url, e); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadPartial('[data-partial="nav"]', '/template/partial/nav.html', function (navEl) {
      if (navEl) {
        setActiveLink(navEl);
        initToggle(navEl);
      }
    });

    loadPartial('[data-partial="footer"]', '/template/partial/footer.html', null);
  });
})();
