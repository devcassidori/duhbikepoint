/* Renderiza o conteúdo do Store no DOM. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const ICONS = {
    wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.3-1.3a4 4 0 0 1-5-5L3 9l3-3 3.3 3.3" /><path d="m14.7 6.3 3-3" />',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/><circle cx="12" cy="12" r="7"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4"/>',
    wheel: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.5v8M12 13.5v8M2.5 12h8M13.5 12h8M5.3 5.3l5.6 5.6M13.1 13.1l5.6 5.6M18.7 5.3l-5.6 5.6M10.9 13.1l-5.6 5.6"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
    fit: '<path d="M4 7h4l3 10h5M14 7h5"/><circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M11 7 9 4H7"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.wrench}</svg>`;

  // Ilustrações vetoriais por modalidade (cards 3D)
  const ART = {
    road: '<svg viewBox="0 0 200 200" fill="none" stroke="#19d11f" stroke-width="2"><circle cx="100" cy="100" r="92" stroke-opacity=".25"/><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="62" stroke-opacity=".4"/>' + Array.from({ length: 24 }, (_, i) => { const a = i * Math.PI / 12; return `<line x1="${100 + Math.cos(a) * 8}" y1="${100 + Math.sin(a) * 8}" x2="${100 + Math.cos(a + .2) * 62}" y2="${100 + Math.sin(a + .2) * 62}" stroke-opacity=".55" stroke-width="1"/>`; }).join('') + '<circle cx="100" cy="100" r="8" fill="#19d11f"/></svg>',
    mtb: '<svg viewBox="0 0 200 200" fill="none" stroke="#c9d11f" stroke-width="2"><circle cx="100" cy="100" r="92" stroke-opacity=".25"/>' + Array.from({ length: 36 }, (_, i) => { const a = i * Math.PI / 18; return `<rect x="${100 + Math.cos(a) * 74 - 3}" y="${100 + Math.sin(a) * 74 - 3}" width="6" height="6" transform="rotate(${i * 10} ${100 + Math.cos(a) * 74} ${100 + Math.sin(a) * 74})" fill="#c9d11f" fill-opacity=".6" stroke="none"/>`; }).join('') + '<circle cx="100" cy="100" r="66"/><circle cx="100" cy="100" r="56" stroke-opacity=".4"/>' + Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return `<line x1="100" y1="100" x2="${100 + Math.cos(a) * 56}" y2="${100 + Math.sin(a) * 56}" stroke-opacity=".5" stroke-width="1"/>`; }).join('') + '<circle cx="100" cy="100" r="10" fill="#c9d11f"/></svg>',
    tt: '<svg viewBox="0 0 200 200" fill="none" stroke="#3fa2ff" stroke-width="2"><circle cx="100" cy="100" r="92" stroke-opacity=".25"/><circle cx="100" cy="100" r="72"/><circle cx="100" cy="100" r="70" fill="#3fa2ff" fill-opacity=".08"/><path d="M100 30 A70 70 0 0 1 170 100" stroke-width="6" stroke-opacity=".5"/><path d="M30 100 A70 70 0 0 1 100 30" stroke-opacity=".3" stroke-width="3"/><circle cx="100" cy="100" r="16" fill="#3fa2ff" fill-opacity=".8" stroke="none"/><path d="M20 140 h40 M10 150 h60 M30 160 h30" stroke-opacity=".5"/></svg>'
  };

  function waLink(msg) {
    const n = (Store.get('brand.whatsapp') || '').replace(/\D/g, '');
    return `https://wa.me/${n}?text=${encodeURIComponent(msg || 'Olá! Vim pelo site da Duh Bike Point e gostaria de agendar um serviço.')}`;
  }

  function renderBindings() {
    $$('[data-cms]').forEach((el) => {
      const v = Store.get(el.dataset.cms);
      if (v != null) el.textContent = v;
    });
  }

  function renderLinks() {
    $$('.js-wa').forEach((a) => (a.href = waLink()));
    const ig = `https://instagram.com/${(Store.get('brand.instagram') || '').replace('@', '')}`;
    $$('.js-ig').forEach((a) => (a.href = ig));
    const q = encodeURIComponent(`${Store.get('brand.address')}, ${Store.get('brand.district')}`);
    $$('.js-maps').forEach((a) => (a.href = `https://www.google.com/maps/search/?api=1&query=${q}`));
    const f = $('#mapFrame');
    if (f) f.src = `https://maps.google.com/maps?q=${q}&z=16&output=embed`;
  }

  function renderServices() {
    const g = $('#servicesGrid'); if (!g) return;
    g.innerHTML = (Store.get('services') || []).map((s, i) => `
      <div class="svc-wrap reveal" style="--d:${(i % 3) * 0.08}s"><article class="svc" data-tilt="10">
        <span class="svc__num">${String(i + 1).padStart(2, '0')}</span>
        <div class="svc__icon">${icon(s.icon)}</div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <span class="svc__glare"></span>
      </article></div>`).join('');
  }

  function renderDisciplines() {
    const st = $('#discStage'); if (!st) return;
    const arts = [ART.road, ART.mtb, ART.tt];
    st.innerHTML = (Store.get('disciplines') || []).map((d, i) => `
      <article class="disc${d.image ? ' has-img' : ''}" data-title="${esc(d.title)}">
        ${d.image ? `<div class="disc__bg" aria-hidden="true"><img src="${esc(d.image)}" alt="" loading="lazy"></div>` : ''}
        <div class="disc__art" aria-hidden="true">${arts[i % 3]}</div>
        <span class="disc__tag">${esc(d.tag)} / ${String((Store.get('disciplines') || []).length).padStart(2, '0')}</span>
        <h3 class="disc__title">${esc(d.title)}</h3>
        <p class="disc__text">${esc(d.text)}</p>
      </article>`).join('');
    const dots = $('#discDots'); if (dots) dots.innerHTML = (Store.get('disciplines') || []).map((_, i) => `<i class="${i ? '' : 'is-active'}"></i>`).join('');
    const big = $('#discBig'); const first = (Store.get('disciplines') || [])[0];
    if (big && first) big.textContent = first.title;
  }

  function renderProcess() {
    const t = $('#processTrack'); if (!t) return;
    t.innerHTML = (Store.get('process') || []).map((p, i) => `
      <article class="step">
        <span class="step__n">${String(i + 1).padStart(2, '0')}</span>
        <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>
      </article>`).join('');
    const cr = $('#chainring');
    if (cr) {
      let teeth = '';
      for (let i = 0; i < 40; i++) teeth += `<rect x="97" y="4" width="6" height="12" rx="1.5" fill="currentColor" transform="rotate(${i * 9} 100 100)"/>`;
      cr.innerHTML = `${teeth}<circle cx="100" cy="100" r="84" fill="none" stroke="currentColor" stroke-width="10"/>` +
        [0, 72, 144, 216, 288].map((a) => `<path d="M100 100 L100 30" stroke="currentColor" stroke-width="14" stroke-linecap="round" transform="rotate(${a} 100 100)"/>`).join('') +
        `<circle cx="100" cy="100" r="22" fill="currentColor"/>`;
    }
  }

  const ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5"/></svg>';
  function renderGallery() {
    const st = $('#carouselStage'); if (!st) return;
    const items = Store.get('gallery') || [];
    st.innerHTML = items.map((g, i) => `
      <button class="slide" type="button" data-index="${i}" aria-label="Ampliar foto ${i + 1}: ${esc(g.alt)}">
        <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="${i < 3 ? 'eager' : 'lazy'}" draggable="false">
        <span class="slide__cap">${esc(g.alt)}</span><span class="slide__zoom" aria-hidden="true">${ZOOM}</span>
      </button>`).join('');
    const dots = $('#carDots');
    if (dots) dots.innerHTML = items.map((_, i) => `<button type="button" role="tab" aria-label="Foto ${i + 1}" aria-selected="${i === 0}" data-go="${i}"></button>`).join('');
  }

  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8L12 2.8Z"/></svg>';
  function stars(n) { const v = Math.round(Math.max(0, Math.min(5, parseFloat(String(n).replace(',', '.')) || 0))); return Array.from({ length: 5 }, (_, i) => `<span class="${i < v ? '' : 'off'}">${STAR}</span>`).join(''); }
  const safeUrl = (u) => (/^https:\/\//.test(u || '') ? u : '');

  // list: [{author, text, rating, date, photo}] · source: rótulo exibido
  function renderReviews(list, source) {
    const r = Store.get('reviews') || {};
    const st = $('#ratingStars'); if (st) st.innerHTML = stars(r.rating || 5);
    $$('.js-reviews').forEach((a) => (a.href = safeUrl(r.url) || '#'));
    $$('.js-review-write').forEach((a) => (a.href = safeUrl(r.writeUrl) || safeUrl(r.url) || '#'));
    const items = (list || r.items || []).filter((x) => x && x.text);
    const rail = $('#reviewsRail'), nav = $('#reviewsNav'), track = $('#reviewsTrack');
    if (!track) return;
    rail.hidden = nav.hidden = !items.length;
    track.innerHTML = items.map((x) => {
      const initial = esc((x.author || '?').trim().charAt(0).toUpperCase());
      const photo = safeUrl(x.photo);
      return `<article class="review">
        <span class="stars" aria-label="${esc(x.rating || 5)} de 5 estrelas">${stars(x.rating || 5)}</span>
        <p class="review__text">${esc(x.text)}</p>
        <div class="review__who"><span class="review__avatar">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : initial}</span>
          <div><strong>${esc(x.author || 'Cliente')}</strong><span>${esc(x.date || 'Google')}</span></div></div>
      </article>`;
    }).join('');
    const src = $('#reviewsSource'); if (src) src.textContent = source || 'Avaliações do Google';
  }

  function renderLists() {
    const marquee = $('#marqueeRow');
    if (marquee) marquee.innerHTML = (Store.get('marquee') || []).map((t) => `<span>${esc(t)}</span><b>✦</b>`).join('');
    const chips = $('#heroChips');
    if (chips) chips.innerHTML = (Store.get('chips') || []).map((t) => `<li>${esc(t)}</li>`).join('');
    const steps = $('#bikeSteps');
    if (steps) steps.innerHTML = (Store.get('sections.bike.steps') || []).slice(0, 5).map((st, i) => `
      <li class="${i ? '' : 'is-active'}"><span class="mono">${String(i + 1).padStart(2, '0')}</span><div><strong>${esc(st.title)}</strong><p>${esc(st.text)}</p></div></li>`).join('');
  }

  function renderMeta() {
    const seo = Store.get('seo') || {};
    if (seo.title) document.title = seo.title;
    const d = document.querySelector('meta[name="description"]'); if (d && seo.description) d.setAttribute('content', seo.description);
    const logo = Store.get('brand.logo');
    if (logo) $$('.js-logo').forEach((img) => { if (img.getAttribute('src') !== logo) img.src = logo; });
    if (logo && !/assets\/logo-512\.png$/.test(logo)) {
      const fav = document.querySelector('link[rel="icon"]'); if (fav) fav.href = logo;
      window.HeroScene && window.HeroScene.setLogo && window.HeroScene.setLogo(logo);
    }
  }

  function renderAll() {
    renderLists(); renderMeta();
    renderBindings(); renderLinks(); renderServices(); renderDisciplines(); renderProcess(); renderGallery(); renderReviews();
    const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  }

  window.Render = { all: renderAll, bindings: renderBindings, links: renderLinks, meta: renderMeta, reviews: renderReviews, ICONS, esc };
})();
