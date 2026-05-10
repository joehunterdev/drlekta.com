/* ============================================================
   video-player.js — custom player for pay-homage-music-vid
   ============================================================ */
(function () {
  function initPlayer() {
    var wrap  = document.getElementById('video-player');
    if (!wrap) return;

    var video = document.getElementById('vp-video');

    /* ── Play / pause toggle ────────────────────────────── */
    function togglePlay() {
      if (video.paused) {
        video.play();
        wrap.classList.add('is-playing');
      } else {
        video.pause();
        wrap.classList.remove('is-playing');
      }
    }

    // clicking anywhere on the wrap plays/pauses
    wrap.addEventListener('click', togglePlay);

    // restore bars overlay when video ends
    video.addEventListener('ended', function () {
      wrap.classList.remove('is-playing');
    });
  }

  // Wait for partials to finish injecting before init
  document.addEventListener('partials:ready', initPlayer);
  // Fallback if event already fired or partial is inline
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initPlayer();
  } else {
    document.addEventListener('DOMContentLoaded', initPlayer);
  }
})();
