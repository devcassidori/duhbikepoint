/* Inicialização: carrega conteúdo → renderiza → efeitos → CMS → tira o loader. */
(async function () {
  const loader = document.getElementById('loader');
  const bar = loader && loader.querySelector('.loader__bar span');
  let pct = 8; const fake = setInterval(() => { pct = Math.min(pct + Math.random() * 14, 88); if (bar) bar.style.width = pct + '%'; }, 120);

  await Store.load();
  Render.all();
  try { Effects.init(); } catch (e) { console.error('[efeitos]', e); }
  try { CMS.init(); } catch (e) { console.error('[cms]', e); }

  const done = () => {
    clearInterval(fake); if (bar) bar.style.width = '100%';
    setTimeout(() => {
      loader && loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
      Effects.heroIntro(); Effects.refresh();
    }, 250);
  };
  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(done);

  // Modo captura (prints do README): ?capture=<id da seção>:<progresso 0-1>
  const cap = new URLSearchParams(location.search).get('capture');
  if (cap) {
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation-play-state:paused!important}.loader,.cursor,.grain{display:none!important}';
    document.head.appendChild(st);
    document.querySelectorAll('.reveal,.split-words,.anim-in').forEach((el) => el.classList.add('is-in'));
    const [id, prog] = cap.split(':');
    setTimeout(() => {
      const el = id && id !== 'top' ? document.getElementById(id) : null;
      const y = el ? el.offsetTop + (el.offsetHeight > innerHeight * 1.5 ? (el.offsetHeight - innerHeight) * (parseFloat(prog) || 0) : 0) : 0;
      window.lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    }, 600);
  }
})();
