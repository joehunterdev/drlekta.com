/* ============================================================
   video-player.js — custom player for pay-homage-music-vid
   ============================================================ */
(function () {
  function initPlayer() {
    var wrap    = document.getElementById('video-player');
    if (!wrap) return;

    var video   = document.getElementById('vp-video');
    var playBtn = document.getElementById('vp-play-btn');
    var cursor  = document.getElementById('vp-cursor');

    /* ── Custom cursor tracking ─────────────────────────── */
    wrap.addEventListener('mouseenter', function () {
      cursor.style.display = 'block';
    });
    wrap.addEventListener('mouseleave', function () {
      cursor.style.display = 'none';
      wrap.classList.remove('cursor--near-btn');
    });
    wrap.addEventListener('mousemove', function (e) {
      var rect = wrap.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;

      cursor.style.left = x + 'px';
      cursor.style.top  = y + 'px';

      // detect proximity to centre play button (80px radius)
      var cx = rect.width / 2;
      var cy = rect.height / 2;
      var dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      wrap.classList.toggle('cursor--near-btn', dist < 80);
    });

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

    playBtn.addEventListener('click', togglePlay);

    // clicking the video itself toggles play/pause after started
    video.addEventListener('click', togglePlay);

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
