(function () {
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');

  let W, H, t = 0;

  // --- Drop origins: where the "blood" falls from ---
  const drops = [
    { x: 0.35, y: 0.3,  speed: 0.00042, scale: 1.1 },
    { x: 0.65, y: 0.55, speed: 0.00031, scale: 0.85 },
    { x: 0.5,  y: 0.15, speed: 0.00055, scale: 0.7  },
    { x: 0.2,  y: 0.7,  speed: 0.00028, scale: 0.9  },
  ];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function hsl(h, s, l, a) {
    return `hsla(${h},${s}%,${l}%,${a})`;
  }

  function draw() {
    // Fade to black each frame — trail length controls how "long" the swirl persists
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, 0, W, H);

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    // Resolution step — higher = faster but blockier
    const step = 4;

    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        let val = 0;

        // Sum interference from each drop origin
        for (const d of drops) {
          const ox = x / W - d.x;
          const oy = y / H - d.y;
          const dist = Math.sqrt(ox * ox + oy * oy);
          const angle = Math.atan2(oy, ox);

          // Expanding ring + angular swirl — like ink diffusing and rotating
          val += Math.sin(
            dist * 18 * d.scale
            - t * d.speed * 60000
            + angle * 2.5
          );
        }

        // Normalise to 0-1
        const n = (val / drops.length + 1) / 2;

        // Map to blood palette: near-black → deep red → crimson → bright edge
        let r = 0, g = 0, b = 0, a = 0;

        if (n > 0.38) {
          const p = (n - 0.38) / 0.62; // 0-1 within the visible range
          r = Math.round(p * p * 210);       // deep red ramp
          g = Math.round(p * p * 4);         // almost no green
          b = Math.round(p * p * 8);         // tiny blue keeps it rich
          a = Math.round(p * 180);           // alpha fade at edges
        }

        if (a > 0) {
          const idx = (y * W + x) * 4;
          for (let dy = 0; dy < step; dy++) {
            for (let dx = 0; dx < step; dx++) {
              const i = ((y + dy) * W + (x + dx)) * 4;
              if (i < data.length - 3) {
                // Blend additively so layers build up
                data[i]     = Math.min(255, data[i]     + r);
                data[i + 1] = Math.min(255, data[i + 1] + g);
                data[i + 2] = Math.min(255, data[i + 2] + b);
                data[i + 3] = 255;
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Slowly darken back to keep it moody — black wins unless actively lit
    ctx.fillStyle = 'rgba(0,0,0,0.018)';
    ctx.fillRect(0, 0, W, H);

    t++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
