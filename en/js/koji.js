// Koji Beats UI Enhancements: cursor, player, visualizer, dark room, interactions
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Custom Cursor
  const cursor = document.createElement('div');
  cursor.className = 'cursor-dot';
  document.body.appendChild(cursor);
  document.addEventListener('mousemove', (e) => {
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
  const hoverables = ['a', 'button', '.btn', '.play-snippet', '.disc-card', '.play-btn'];
  document.addEventListener('mouseover', (e) => {
    if (hoverables.some(sel => e.target.closest(sel))) cursor.classList.add('hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (hoverables.some(sel => e.target.closest(sel))) cursor.classList.remove('hover');
  });


  // Visualizer bars
  const viz = document.createElement('div');
  viz.id = 'visualizer';
  const vizBars = [];
  for (let i = 0; i < 24; i++) { // mais barras para suavidade
    const bar = document.createElement('div');
    bar.className = 'bar';
    viz.appendChild(bar);
    vizBars.push(bar);
  }
  document.body.appendChild(viz);
  // Web Audio API analyser for real visualizer
  let audioCtx, analyser, mediaSrc, rafId;

  // ===== Micro-interactions & Animations =====
  // Reveal on scroll (no HTML changes; add attributes programaticamente)
  (function revealOnScroll(){
    const sel = [
      '.section-heading', '.single-album-area', '.single-album',
      '.single-top-item', '.single-new-item', '.single-artists',
      '.featured-artist-thumb', '.featured-artist-content',
      '.hero-slides-content', '.mask-triangle', '#beat-store .mini-player'
    ].join(',');
    const nodes = $$(sel);
    nodes.forEach(n => {
      if (!n.hasAttribute('data-animate')) {
        let t = 'up';
        if (n.matches('.featured-artist-thumb')) t = 'left';
        if (n.matches('.featured-artist-content')) t = 'right';
        n.setAttribute('data-animate', t);
      }
    });
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
    nodes.forEach(n => io.observe(n));
  })();

  // Tilt hover para cards
  (function tiltHover(){
    const tilts = $$('.single-album-area, .top-beat-card');
    tilts.forEach(el => {
      el.classList.add('tilt-card');
      const onMove = (e) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width/2; const cy = r.top + r.height/2;
        const dx = (e.clientX - cx) / r.width; const dy = (e.clientY - cy) / r.height;
        const rx = (dy * -6).toFixed(2); const ry = (dx * 6).toFixed(2);
        el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.01)`;
      };
      const reset = () => { el.style.transform = ''; };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', reset);
    });
  })();

  // Ripple em botões
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.oneMusic-btn, .play-btn-modern');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const span = document.createElement('span');
    span.className = 'btn-ripple';
    span.style.left = (e.clientX - rect.left) + 'px';
    span.style.top = (e.clientY - rect.top) + 'px';
    btn.appendChild(span);
    setTimeout(() => span.remove(), 650);
  });

  // Global audio element (fallback when mini-player is absent)
  let audio = $('#kojiAudio');
  const playToggle = $('#playToggle');
  if (!audio) {
    audio = document.getElementById('siteAudio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'siteAudio';
      audio.preload = 'auto';
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
  }
  function setPlaying(p) {
    document.body.classList.toggle('is-playing', !!p);
  }
  if (audio) {
    ['play', 'playing'].forEach(ev => audio.addEventListener(ev, () => setPlaying(true)));
    ['pause', 'ended', 'stalled', 'suspend'].forEach(ev => audio.addEventListener(ev, () => setPlaying(false)));
    // Start/stop analyser-driven visualizer
    function ensureAnalyser() {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // 64 bins visíveis
        analyser.smoothingTimeConstant = 0.85;
        mediaSrc = audioCtx.createMediaElementSource(audio);
        mediaSrc.connect(analyser);
        analyser.connect(audioCtx.destination);
      }
    }
    function startViz() {
      ensureAnalyser();
      if (!analyser) return;
      try { if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(e){}
      const data = new Uint8Array(analyser.frequencyBinCount);
      const nBars = vizBars.length;
      function draw() {
        analyser.getByteFrequencyData(data);
        const chunk = Math.floor(data.length / nBars) || 1;
        for (let i = 0; i < nBars; i++) {
          let sum = 0;
          const start = i * chunk;
          const end = i === nBars - 1 ? data.length : start + chunk;
          for (let j = start; j < end; j++) sum += data[j];
          const avg = sum / (end - start);
          const scale = 0.2 + (avg / 255) * 2.2; // 0.2 a ~2.4
          vizBars[i].style.transform = `scaleY(${scale.toFixed(2)})`;
        }
        rafId = requestAnimationFrame(draw);
      }
      cancelAnimationFrame(rafId || 0);
      draw();
    }
    function stopViz() {
      cancelAnimationFrame(rafId || 0);
      vizBars.forEach(b => b.style.transform = 'scaleY(.2)');
    }
    audio.addEventListener('play', startViz);
    audio.addEventListener('pause', stopViz);
    audio.addEventListener('ended', stopViz);
  }
  if (playToggle && audio) {
    playToggle.addEventListener('click', () => {
      if (audio.paused) audio.play(); else audio.pause();
    });
  }

  // Helper: play/pause toggle for a given source + progress
  let currentAnchor = null;
  let currentCard = null;
  let currentBar = null;
  // progress listeners
  audio.addEventListener('timeupdate', () => {
    if (!currentBar || !audio.duration) return;
    const p = Math.min(100, Math.max(0, (audio.currentTime / audio.duration) * 100));
    currentBar.style.width = p + '%';
  });
  audio.addEventListener('pause', () => {
    if (currentAnchor) currentAnchor.classList.remove('playing');
    if (currentCard) currentCard.classList.remove('playing');
    if (currentCard) {
      const btn = currentCard.querySelector('.album-info .play-btn-modern');
      if (btn) btn.textContent = '';
    }
  });
  audio.addEventListener('ended', () => {
    if (currentAnchor) currentAnchor.classList.remove('playing');
    if (currentCard) currentCard.classList.remove('playing');
    if (currentBar) currentBar.style.width = '0%';
    if (currentCard) {
      const btn = currentCard.querySelector('.album-info .play-btn-modern');
      if (btn) btn.textContent = '';
    }
  });

  function playOrPause(src, anchor){
    if (!audio) return;
    const isSame = audio.src && audio.src.indexOf(src) !== -1;
    if (isSame && !audio.paused) {
      audio.pause();
      if (currentAnchor) currentAnchor.classList.remove('playing');
      if (currentCard) currentCard.classList.remove('playing');
      return;
    }
    if (!isSame) audio.src = src;
    audio.currentTime = 0;
    audio.play();
    if (currentAnchor) currentAnchor.classList.remove('playing');
    if (currentCard) currentCard.classList.remove('playing');
    currentAnchor = anchor || null;
    if (currentAnchor) currentAnchor.classList.add('playing');
    currentCard = anchor ? anchor.closest('.single-album-area') : null;
    if (currentCard) {
      currentCard.classList.add('playing');
      currentBar = currentCard.querySelector('.track-progress .bar');
      if (currentBar) currentBar.style.width = '0%';
    } else {
      currentBar = null;
    }
  }

  // Top 3 play buttons - reuse same audio element as preview
  $$('.play-snippet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const src = btn.getAttribute('data-src');
      playOrPause(src, btn);
    });
  });

  // Discografia play overlay -> just toggles preview
  $$('#discografia .disc-card .play-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!audio) return;
      audio.currentTime = 0;
      audio.play();
    });
  });

  // Hero: Play beat (unmute and play background mp4 if provided)
  const heroVideo = document.getElementById('heroVideo');
  const heroBeatBtn = document.getElementById('heroBeatBtn');
  if (heroVideo && heroBeatBtn) {
    heroBeatBtn.addEventListener('click', (e) => {
      e.preventDefault();
      try {
        heroVideo.muted = false;
        const p = heroVideo.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch (_) {}
    });
  }

  // Mouse-following color blob behind the triangle
  const blob = document.getElementById('color-blob');
  const hero = document.querySelector('.hero-drake');
  if (blob && hero) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let posX = targetX, posY = targetY;
    const lerp = (a, b, t) => a + (b - a) * t;
    function tick() {
      posX = lerp(posX, targetX, 0.08);
      posY = lerp(posY, targetY, 0.08);
      blob.style.transform = `translate(${posX}px, ${posY}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    }
    tick();
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      targetX = e.clientX - r.left;
      targetY = e.clientY - r.top;
    });
    // Center on resize
    window.addEventListener('resize', () => {
      const r = hero.getBoundingClientRect();
      targetX = r.width / 2; targetY = r.height / 2;
    });
  }

  // ====== Músicas: render grid from manifest with Load More ======
  (function setupMusicas(){
    const grid = document.getElementById('musicas-grid');
    if (!grid) return;
    const btn = document.getElementById('loadMoreMusicas');
    const pageSize = 12; // items per load
    let items = [];
    let page = 0;

    function prettify(name){
      name = name.replace(/\.[^.]+$/, '');
      name = name.replace(/[_-]+/g, ' ');
      return name.replace(/\b\w/g, s => s.toUpperCase());
    }

    function toAudioPath(imgFile){
      const base = imgFile.replace(/\.[^.]+$/, '');
      return `audio/${base}.mp3`;
    }

    function card(src, title, audioSrc){
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-md-4 col-lg-2';
      col.innerHTML = `
        <div class="single-album-area wow fadeInUp" data-wow-delay="100ms">
          <div class="album-thumb">
            <img src="${src}" alt="${title}">
            <div class="cover-play"><button class="play-btn-modern play-track" data-audio="${audioSrc}">Play</button></div>
          </div>
          <div class="album-info">
            <a href="#"><h5 style="color:white;">${title}</h5></a>
            <div class="track-progress"><div class="bar"></div></div>
          </div>
        </div>`;
      return col;
    }

    function renderMore(){
      const start = page * pageSize;
      const end = Math.min(items.length, start + pageSize);
      for (let i=start; i<end; i++){
        const file = items[i];
        const audioSrc = toAudioPath(file);
        grid.appendChild(card(`img/musicas/${file}`, prettify(file), audioSrc));
      }
      page++;
      if (page * pageSize >= items.length && btn){ btn.disabled = true; btn.innerHTML = 'Tudo carregado'; }
    }

    fetch('img/musicas/manifest.json')
      .then(r => r.json())
      .then(list => { items = list || []; renderMore(); })
      .catch(() => { /* silencioso */ });

    if (btn) btn.addEventListener('click', (e)=>{ e.preventDefault(); renderMore(); });

    // Play handler via delegation
    grid.addEventListener('click', (e) => {
      const a = e.target.closest('.play-track');
      if (!a) return;
      e.preventDefault();
      const src = a.getAttribute('data-audio');
      playOrPause(src, a);
    });
  })();

  // VANTA HALO init (executa após o load, não interfere na UI)
  function initVanta() {
    const target = document.getElementById('vanta-hero') || document.getElementById('vanta-bg');
    if (!window.VANTA || !target) return;
    try {
      const v = window.VANTA.HALO({
        el: target,
        mouseControls: true,
        touchControls: true,
        minHeight: 60.0,
        minWidth: 160.0,
        baseColor: 0x000000,
        backgroundColor: 0x000000,
        amplitudeFactor: 2.0,
        xOffset: 0.01,
        yOffset: 0.01,
        size: 2
      });
      window.addEventListener('beforeunload', () => v && v.destroy && v.destroy());
    } catch (_) {}
  }
  if (document.readyState === 'complete') initVanta();
  else window.addEventListener('load', initVanta);

  // Noise overlay (leve)
  (function simpleNoise(){
    const canvas = document.getElementById('vanta-noise-hero') || document.getElementById('vanta-noise');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    function resize(){
      const parent = canvas.parentElement || document.body;
      const r = parent.getBoundingClientRect();
      canvas.width = r.width; canvas.height = r.height;
    }
    window.addEventListener('resize', resize); resize();
    let n=0; function frame(){
      const w=canvas.width,h=canvas.height; const id=ctx.createImageData(w,h); const buf=new Uint32Array(id.data.buffer);
      for(let i=0;i<buf.length;i+=5){ if(((Math.random()+n%3*0.05)<0.06)) buf[i]=0xff000000; }
      ctx.putImageData(id,0,0); n++; requestAnimationFrame(frame);
    } frame();
  })();
})();
