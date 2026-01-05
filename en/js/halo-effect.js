/* Koji Beats — Hero HALO (Vanta.js) init
 * Requires:
 *  - three.js r134
 *  - vanta.halo.min.js
 *
 * This file targets ONLY the hero section via #haloHero and #haloNoise.
 */
(function () {
  "use strict";

  var haloInstance = null;

  function initVanta() {
    var el = document.getElementById("haloHero");
    if (!el || !window.VANTA || !VANTA.HALO) return;

    // Avoid double-init (e.g., if scripts reload)
    if (haloInstance && haloInstance.destroy) {
      try { haloInstance.destroy(); } catch (_) {}
      haloInstance = null;
    }

    haloInstance = VANTA.HALO({
      el: el,
      mouseControls: true,
      touchControls: true,
      minHeight: 160.0,
      minWidth: 160.0,
      baseColor: 0x000000,
      backgroundColor: 0x000000,
      amplitudeFactor: 3.0,
      xOffset: 0.01,
      yOffset: 0.01,
      size: 1.40
    });
  }

  // Noise overlay, scoped to hero
  function initNoise() {
    var canvas = document.getElementById("haloNoise");
    var hero = document.querySelector(".hero-area .single-hero-slide");
    if (!canvas || !hero) return;

    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var w = 0, h = 0;
    var noiseData = [];
    var frame = 0;
    var loopTimeout = null;

    function resize() {
      var r = hero.getBoundingClientRect();
      // match hero size (not full page)
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w;
      canvas.height = h;

      noiseData = [];
      for (var i = 0; i < 10; i++) createNoise();
    }

    function createNoise() {
      var idata = ctx.createImageData(w, h);
      var buffer32 = new Uint32Array(idata.data.buffer);
      var len = buffer32.length;
      for (var i = 0; i < len; i++) {
        if (Math.random() < 0.1) buffer32[i] = 0xff000000;
      }
      noiseData.push(idata);
    }

    function paintNoise() {
      frame = frame === 9 ? 0 : frame + 1;
      ctx.putImageData(noiseData[frame], 0, 0);
    }

    function loop() {
      paintNoise();
      loopTimeout = window.setTimeout(function () {
        window.requestAnimationFrame(loop);
      }, (1000 / 25));
    }

    // Attach canvas exactly over hero slide
    function syncCanvasPosition() {
      var r = hero.getBoundingClientRect();
      // absolute inside .single-hero-slide, which is relative
      canvas.style.left = "0px";
      canvas.style.top = "0px";
      canvas.style.width = r.width + "px";
      canvas.style.height = r.height + "px";
    }

    var resizeThrottle;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeThrottle);
      resizeThrottle = window.setTimeout(function () {
        window.clearTimeout(loopTimeout);
        resize();
        syncCanvasPosition();
      }, 200);
    }, { passive: true });

    // Initial
    resize();
    syncCanvasPosition();
    loop();
  }

  // Init once DOM is ready (works with template loading)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initVanta();
      initNoise();
    });
  } else {
    initVanta();
    initNoise();
  }

  // Cleanup
  window.addEventListener("beforeunload", function () {
    if (haloInstance && haloInstance.destroy) {
      try { haloInstance.destroy(); } catch (_) {}
    }
  });
})();