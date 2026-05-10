/* ============================================================
   main.js — Dr Lekta site scripts
   ============================================================ */

/* ── AOS ──────────────────────────────────────────────────── */
function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60
    });
  }
}

window.addEventListener('DOMContentLoaded', initAOS);

// Re-run after partials are injected so AOS picks up partial elements
window.addEventListener('partials:ready', function () {
  if (typeof AOS !== 'undefined') {
    AOS.refreshHard();
  }
});

/* ── Video loader ─────────────────────────────────────────── */
window.addEventListener('load', function () {

  function startVideo(v) {
    v.setAttribute('autoplay', '');
    v.muted = true;
    v.src = v.dataset.src;
    v.load();
    var p = v.play();
    if (p !== undefined) p.catch(function () {});
  }

  // hero text video — load right away
  var hero = document.querySelector('.hero-text-video');
  if (hero && hero.dataset.src) startVideo(hero);

  // section background videos — injected from data-video-bg / data-video-bg-flip
  var bgSections = document.querySelectorAll('[data-video-bg], [data-video-bg-flip]');

  function injectAndStart(section) {
    var src = section.dataset.videoBg || section.dataset.videoBgFlip;
    var v = document.createElement('video');
    v.className = 'section-video-bg';
    v.setAttribute('muted', '');
    v.setAttribute('loop', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    section.insertBefore(v, section.firstChild);
    v.muted = true;
    v.setAttribute('autoplay', '');
    v.src = src;
    v.load();
    var p = v.play();
    if (p !== undefined) p.catch(function () {});
  }

  if ('IntersectionObserver' in window) {
    var bgObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          injectAndStart(entry.target);
          bgObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '400px' });
    bgSections.forEach(function (s) { bgObserver.observe(s); });
  } else {
    bgSections.forEach(injectAndStart);
  }

});
