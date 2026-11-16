/* Efeitos: smooth scroll, menu, revelações, tilt 3D, carrossel, seções fixadas (GSAP). Chamado por app.js depois do conteúdo renderizado. */
window.Effects = (function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  let lenis = null;

  /* ---------- Split ---------- */
  function splitChars(el) {
    const text = el.textContent; el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === ' ' ? '&nbsp;' : Render.esc(c)}</span>`).join('');
  }
  function splitWords(el) {
    const text = el.textContent.trim(); el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map((w, i) => `<span class="w" aria-hidden="true"><span style="--i:${i}">${Render.esc(w)}</span></span>`).join(' ');
  }

  /* ---------- Scroll suave ---------- */
  function initScroll() {
    if (window.Lenis && !reduce && fine) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
      window.lenis = lenis;
      if (hasGsap) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
      else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    }
  }
  function scrollToTarget(target) {
    const headerH = $('#header').offsetHeight;
    const y = target === 0 ? 0 : target.getBoundingClientRect().top + scrollY - (target.matches('.bike,.disciplines,.process,.hero') ? 0 : headerH - 1);
    if (lenis) lenis.scrollTo(y, { duration: 1.4 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  window.scrollToTarget = scrollToTarget;
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a) return;
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const target = id === '#top' ? 0 : $(id); if (target == null) return;
      e.preventDefault(); closeMenu(true); scrollToTarget(target);
      history.replaceState(null, '', id === '#top' ? location.pathname : id);
    });
  }

  /* ---------- Header, estrada de progresso, seção ativa ---------- */
  function initHeader() {
    const header = $('#header'), fill = $('#roadFill'), rb = $('#roadBike'), w1 = $('#rbW1'), w2 = $('#rbW2'), dots = $('#dots');
    let ticking = false;
    function update() {
      ticking = false;
      const y = scrollY, max = document.documentElement.scrollHeight - innerHeight, p = max > 0 ? y / max : 0;
      header.classList.toggle('is-scrolled', y > 20);
      fill.style.transform = `scaleX(${p})`;
      rb.style.transform = `translateX(${p * (innerWidth - 34) - 4}px)`;
      const rot = `rotate(${y * 0.6}deg)`; w1.style.transform = rot; w2.style.transform = rot;
      dots.classList.toggle('is-visible', y > innerHeight * 0.6);
      document.body.classList.toggle('at-hero', y < innerHeight * 0.55);
    }
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); update();

    const links = $$('.nav a, .dots a, .menu__nav a');
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = en.target.id === 'hero' ? 'top' : en.target.id;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + id));
    }), { rootMargin: '-48% 0px -48% 0px' });
    $$('[data-section]').forEach((s) => io.observe(s));
  }

  /* ---------- Menu ---------- */
  const menu = () => $('#menu'), btn = () => $('#menuBtn');
  function openMenu() {
    const m = menu(); m.hidden = false; $$('.menu__nav a', m).forEach((a, i) => a.style.setProperty('--i', i));
    requestAnimationFrame(() => requestAnimationFrame(() => m.classList.add('is-open')));
    btn().setAttribute('aria-expanded', 'true'); btn().querySelector('.menu-btn__label').textContent = Store.get('labels.close') || 'Fechar';
    document.body.classList.add('menu-open'); lenis && lenis.stop();
    setTimeout(() => { const a = $('.menu__nav a', m); a && a.focus({ preventScroll: true }); }, 300);
  }
  function closeMenu(instant) {
    const m = menu(); if (!m || m.hidden) return;
    m.classList.remove('is-open'); btn().setAttribute('aria-expanded', 'false'); btn().querySelector('.menu-btn__label').textContent = Store.get('labels.menu') || 'Menu';
    document.body.classList.remove('menu-open'); lenis && lenis.start();
    setTimeout(() => { if (!m.classList.contains('is-open')) m.hidden = true; }, instant ? 0 : 700);
  }
  function initMenu() {
    btn().addEventListener('click', () => (menu().hidden ? openMenu() : closeMenu()));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    addEventListener('resize', () => { if (!menu().hidden && innerWidth > 0) {} });
  }

  /* ---------- Cursor ---------- */
  function initCursor() {
    if (!fine || reduce) return;
    const c = $('#cursor'); let cx = -100, cy = -100, tx = -100, ty = -100;
    addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; c.classList.add('is-active'); }, { passive: true });
    document.addEventListener('pointerover', (e) => c.classList.toggle('is-hover', !!e.target.closest('a,button,[data-tilt],input,textarea,select')));
    document.addEventListener('pointerleave', () => c.classList.remove('is-active'));
    (function loop() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); })();
  }

  /* ---------- Revelações (IntersectionObserver + CSS) ---------- */
  function initReveals() {
    $$('.split-words').forEach(splitWords);
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    $$('.reveal, .split-words').forEach((el) => io.observe(el));
  }
  function heroIntro() {
    $$('.hero__title .split').forEach(splitChars);
    const hero = $('#hero');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      hero.classList.add('is-ready');
      $$('.hero .anim-in').forEach((el, i) => { el.style.setProperty('--d', (0.45 + i * 0.1) + 's'); el.classList.add('is-in'); });
    }));
  }

  /* ---------- Tilt 3D (apenas o elemento com data-tilt; nada mais anima o transform dele) ---------- */
  function initTilt() {
    if (!fine || reduce) return;
    $$('[data-tilt]').forEach((el) => {
      const max = +el.dataset.tilt || 10; let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
      const loop = () => { rx += (tx - rx) * 0.12; ry += (ty - ry) * 0.12; el.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`; if (Math.abs(tx - rx) + Math.abs(ty - ry) > 0.02) raf = requestAnimationFrame(loop); else raf = 0; };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        tx = (0.5 - py) * max; ty = (px - 0.5) * max;
        el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
        el.style.setProperty('--gx', px * 100 + '%'); el.style.setProperty('--gy', py * 100 + '%');
        kick();
      });
      el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
    });
  }

  /* ---------- Botões magnéticos (usa a propriedade translate, sem conflito) ---------- */
  function initMagnetic() {
    if (!fine || reduce) return;
    $$('.magnetic').forEach((b) => {
      b.style.transition += ', translate .5s cubic-bezier(.34,1.56,.64,1)';
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); b.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.22}px ${(e.clientY - r.top - r.height / 2) * 0.3}px`; });
      b.addEventListener('pointerleave', () => (b.style.translate = '0 0'));
    });
  }

  /* ---------- Lightbox (modal de imagem) ---------- */
  const LB = { list: [], i: 0, lastFocus: null };
  function lbShow(i) {
    const n = LB.list.length; if (!n) return;
    LB.i = (i + n) % n; const it = LB.list[LB.i];
    const img = $('#lbImg'); img.style.opacity = 0;
    img.onload = () => (img.style.opacity = 1);
    img.src = it.src; img.alt = it.alt || '';
    $('#lbCap').textContent = it.alt || ''; $('#lbCount').textContent = `${LB.i + 1} / ${n}`;
    $('#lbPrev').hidden = $('#lbNext').hidden = n < 2;
  }
  function openLightbox(list, i) {
    const lb = $('#lightbox'); LB.list = list; LB.lastFocus = document.activeElement;
    lb.hidden = false; lbShow(i); document.body.classList.add('lb-open'); lenis && lenis.stop();
    requestAnimationFrame(() => requestAnimationFrame(() => lb.classList.add('is-open')));
    setTimeout(() => $('#lbClose').focus(), 50);
  }
  function closeLightbox() {
    const lb = $('#lightbox'); if (lb.hidden) return;
    lb.classList.remove('is-open'); document.body.classList.remove('lb-open'); lenis && lenis.start();
    setTimeout(() => { lb.hidden = true; $('#lbImg').removeAttribute('src'); }, 350);
    LB.lastFocus && LB.lastFocus.focus && LB.lastFocus.focus({ preventScroll: true });
  }
  function initLightbox() {
    const lb = $('#lightbox'); if (!lb) return;
    $('#lbImg').style.transition = 'opacity .3s';
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', () => lbShow(LB.i - 1));
    $('#lbNext').addEventListener('click', () => lbShow(LB.i + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__figure')) closeLightbox(); });
    addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') lbShow(LB.i - 1);
      if (e.key === 'ArrowRight') lbShow(LB.i + 1);
      if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button:not([hidden])')]; const k = f.indexOf(document.activeElement); if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    let sx = 0, sy = 0;
    lb.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    lb.addEventListener('pointerup', (e) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) lbShow(LB.i + (dx < 0 ? 1 : -1)); else if (dy > 90) closeLightbox(); });
  }
  window.openLightbox = openLightbox;

  /* ---------- Galeria: carrossel 3D (coverflow) ---------- */
  function initCarousel() {
    const stage = $('#carouselStage'); if (!stage) return;
    const slides = $$('.slide', stage); const n = slides.length; if (!n) return;
    const dots = $$('#carDots button'), prev = $('#carPrev'), next = $('#carNext');
    let active = 0, dragX = 0, startX = 0, startY = 0, dragging = false, moved = false, axis = null, timer = 0, inView = false;
    const list = () => slides.map((s) => ({ src: s.querySelector('img').currentSrc || s.querySelector('img').src, alt: s.querySelector('img').alt }));

    function layout() {
      const w = slides[0].offsetWidth; const gap = innerWidth < 640 ? w * 0.62 : w * 0.72;
      slides.forEach((s, i) => {
        let off = i - active; if (off > n / 2) off -= n; if (off < -n / 2) off += n; // laço infinito
        const o = off + dragX / gap; const a = Math.abs(o);
        const tx = o * gap, tz = -Math.min(a, 3) * 170, ry = Math.max(-1, Math.min(1, -o)) * 32 * Math.min(a, 1.4);
        s.style.transform = `translate(-50%, -50%) translate3d(${tx.toFixed(1)}px,0,${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${(1 - Math.min(a, 2) * 0.08).toFixed(3)})`;
        s.style.opacity = a > 2.6 ? 0 : 1;
        s.style.filter = `brightness(${(1 - Math.min(a, 2) * 0.28).toFixed(2)})`;
        s.style.zIndex = String(100 - Math.round(a * 10));
        s.classList.toggle('is-active', off === 0);
        s.tabIndex = off === 0 ? 0 : -1;
        s.style.pointerEvents = a > 2.6 ? 'none' : '';
      });
      dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === active)));
    }
    function go(i) { active = (i + n) % n; layout(); restart(); }
    function restart() { clearInterval(timer); if (!reduce && inView) timer = setInterval(() => { if (!dragging && $('#lightbox').hidden) go(active + 1); }, 4500); }

    prev.addEventListener('click', () => go(active - 1));
    next.addEventListener('click', () => go(active + 1));
    dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.go)));
    stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(active - 1); if (e.key === 'ArrowRight') go(active + 1); });

    stage.addEventListener('pointerdown', (e) => { dragging = true; moved = false; axis = null; startX = e.clientX; startY = e.clientY; dragX = 0; slides.forEach((s) => (s.style.transition = 'none')); });
    addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!axis && Math.abs(dx) + Math.abs(dy) > 8) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') { moved = true; dragX = dx; layout(); }
    }, { passive: true });
    const end = () => {
      if (!dragging) return; dragging = false; slides.forEach((s) => (s.style.transition = ''));
      const w = slides[0].offsetWidth * 0.3;
      if (dragX < -w) active = (active + 1) % n; else if (dragX > w) active = (active - 1 + n) % n;
      dragX = 0; layout(); restart();
    };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);

    slides.forEach((s, i) => s.addEventListener('click', (e) => {
      if (moved) { e.preventDefault(); return; }
      if (i === active) openLightbox(list(), i); else go(i);
    }));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; restart(); }).observe(stage);
    addEventListener('resize', layout);
    layout();
  }

  /* ---------- Avaliações: setas + fonte ao vivo (Supabase Edge Function), se configurada ---------- */
  function initReviews() {
    const rail = $('#reviewsRail');
    const step = () => { const c = $('.review', rail); return c ? c.offsetWidth + 18 : 300; };
    $('#revPrev') && $('#revPrev').addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('#revNext') && $('#revNext').addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));
    const cfg = window.SITE_CONFIG || {};
    if (!cfg.reviewsFunction || !cfg.supabaseUrl) return;
    fetch(`${cfg.supabaseUrl}/functions/v1/${cfg.reviewsFunction}`, { headers: { apikey: cfg.supabaseKey, Authorization: `Bearer ${cfg.supabaseKey}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.reviews) || !d.reviews.length) return;
        if (d.rating) Store.set('reviews.rating', String(d.rating).replace('.', ','));
        if (d.count) Store.set('reviews.count', String(d.count));
        Render.bindings();
        const manual = (Store.get('reviews.items') || []).filter((x) => x && x.text);
        Render.reviews(manual.concat(d.reviews), 'Avaliações do Google');
        refresh();
      }).catch(() => {});
  }

  /* ---------- Contadores ---------- */
  function initCounters() {
    const run = (el) => {
      const to = parseFloat(String(el.dataset.to).replace(',', '.')); if (isNaN(to)) return;
      const dec = (String(el.dataset.to).split(/[.,]/)[1] || '').length, t0 = performance.now(), d = 1600;
      (function f(now) { const p = Math.min((now - t0) / d, 1), e = 1 - Math.pow(1 - p, 4); el.textContent = (to * e).toFixed(dec).replace('.', ','); if (p < 1) requestAnimationFrame(f); })(t0);
    };
    if (reduce) return;
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.5 });
    $$('.count').forEach((c) => { c.textContent = '0'; io.observe(c); });
  }

  /* ---------- Marquee ---------- */
  function initMarquee() {
    const tr = $('#marquee'); if (!tr || reduce) return;
    const row = tr.firstElementChild;
    for (let i = 0; i < 3; i++) tr.appendChild(row.cloneNode(true));
    let x = 0, boost = 0, lastSY = scrollY, w = row.offsetWidth;
    addEventListener('resize', () => (w = row.offsetWidth));
    (function loop() {
      const sd = scrollY - lastSY; lastSY = scrollY; boost += (Math.abs(sd) * 0.25 - boost) * 0.1;
      x -= 1 + boost; if (-x >= w) x += w;
      tr.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; requestAnimationFrame(loop);
    })();
  }

  /* ---------- Seções com scroll (GSAP) ---------- */
  function initScrollScenes() {
    if (!hasGsap) return;
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Hero → cena 3D + parallax do texto
    ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top', onUpdate: (s) => window.HeroScene && window.HeroScene.setProgress(s.progress) });
    if (!reduce) gsap.to('#heroContent', { y: () => -innerHeight * 0.18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });

    if (reduce) return;

    // Moeda gira com o scroll
    gsap.fromTo('#coin', { rotationY: -35, rotationX: 12 }, { rotationY: 35, rotationX: -8, ease: 'none', scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true } });

    // Modalidades: pilha 3D
    const discs = $$('.disc'), big = $('#discBig'), dots = $$('#discDots i');
    if (discs.length > 1) {
      discs.forEach((d, i) => gsap.set(d, { zIndex: i + 1, yPercent: i === 0 ? 0 : 120, rotationX: i === 0 ? 0 : -50, opacity: i === 0 ? 1 : 0, transformPerspective: 1600 }));
      const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.disciplines', start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate: (s) => {
          const tt = s.progress * tl.duration(); const idx = Math.max(0, Math.min(discs.length - 1, Math.floor((tt - 0.35 + 0.95) / 1.45)));
          if (big && big.textContent !== discs[idx].dataset.title) big.textContent = discs[idx].dataset.title;
          dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
        } } });
      discs.forEach((d, i) => {
        if (i === 0) return;
        const at = 0.35 + (i - 1) * 1.45; // pausa entre cards
        tl.to(discs.slice(0, i), { scale: (k) => 0.92 - (i - 1 - k) * 0.05, yPercent: (k) => -7 * (i - k), rotationX: 6, filter: 'brightness(0.5)', duration: 1 }, at)
          .to(d, { yPercent: 0, rotationX: 0, opacity: 1, duration: 1 }, at);
      });
      tl.to({}, { duration: 0.45 });
      gsap.fromTo('.disciplines__bg span', { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.disciplines', start: 'top top', end: 'bottom bottom', scrub: true } });
    }

    // Processo: horizontal
    const track = $('#processTrack'), steps = $$('.step'), bar = $('#processBar');
    if (track && steps.length) {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.process', start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true,
        onUpdate: (s) => {
          bar.style.transform = `scaleX(${s.progress})`;
          const idx = Math.min(steps.length - 1, Math.floor(s.progress * steps.length * 0.999));
          steps.forEach((st, i) => st.classList.toggle('is-active', i === idx));
        } } });
      gsap.to('#chainring', { rotation: 540, ease: 'none', scrollTrigger: { trigger: '.process', start: 'top bottom', end: 'bottom top', scrub: true } });
    }

    // CTA: logo gira em 3D
    gsap.fromTo('#ctaLogo', { rotationY: -180, scale: 0.6 }, { rotationY: 0, scale: 1, ease: 'none', transformPerspective: 800, scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'top 30%', scrub: true } });
  }

  function refresh() { if (hasGsap) ScrollTrigger.refresh(); }

  function init() {
    initScroll(); initAnchors(); initHeader(); initMenu(); initCursor(); initReveals(); initTilt(); initMagnetic();
    initLightbox(); initCarousel(); initReviews(); initMarquee(); initScrollScenes();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    addEventListener('load', refresh);
    // abre na âncora da URL, se houver
    if (location.hash.length > 1) { const t = document.querySelector(location.hash); if (t) setTimeout(() => scrollToTarget(t), 400); }
  }

  return { init, heroIntro, refresh, closeMenu, closeLightbox };
})();
