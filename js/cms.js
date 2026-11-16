/* CMS: duplo clique (ou toque duplo) no logo → login → painel.
   Modo online (Supabase configurado em js/config.js): login pelo Supabase Auth, salva no banco e publica na hora, fotos no Storage.
   Modo local (sem Supabase): edições salvas neste navegador; publicação baixando o content.js. */
window.CMS = (function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s) => Render.esc(s);
  const cfg = window.SITE_CONFIG || {};
  const online = Store.online, sb = Store.sb;

  // Modo local: hash SHA-256 de "duhbikepoint::<usuário>::<senha>"
  const LOCAL_DEFAULT = { user: 'admin', hash: '5cf2c873ea8915d0b8ae3c510c54c8bf74d507ec7e045f199fd70ec6f7a6c0b2' };
  const AUTH_KEY = 'duhbp.localauth.v2', SESSION_KEY = 'duhbp.session', REOPEN_KEY = 'duhbp.reopen';
  const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }, del(k) { try { sessionStorage.removeItem(k); } catch (e) {} } };
  const localAuth = () => { try { return JSON.parse(Store.safeGet(AUTH_KEY)) || LOCAL_DEFAULT; } catch (e) { return LOCAL_DEFAULT; } };

  async function sha256(str) {
    if (window.crypto && crypto.subtle && window.isSecureContext) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    return sha256js(str);
  }
  function sha256js(ascii) {
    const rr = (v, a) => (v >>> a) | (v << (32 - a)); const bytes = new TextEncoder().encode(ascii); const K = [], H = []; let p = 0;
    for (let c = 2; p < 64; c++) { let pr = true; for (let d = 2; d * d <= c; d++) if (c % d === 0) { pr = false; break; } if (pr) { if (p < 8) H[p] = (Math.pow(c, 0.5) * 4294967296) | 0; K[p++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; } }
    const l = bytes.length, padded = new Uint8Array(((l + 9 + 63) >> 6) << 6); padded.set(bytes); padded[l] = 0x80;
    const dv = new DataView(padded.buffer), bits = l * 8; dv.setUint32(padded.length - 4, bits >>> 0); dv.setUint32(padded.length - 8, Math.floor(bits / 4294967296));
    const words = []; for (let i = 0; i < padded.length; i += 4) words.push(dv.getUint32(i));
    for (let j = 0; j < words.length; j += 16) {
      const w = words.slice(j, j + 16), h = H.slice(0);
      for (let i = 0; i < 64; i++) {
        if (i >= 16) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (rr(a, 7) ^ rr(a, 18) ^ (a >>> 3)) + w[i - 7] + (rr(b, 17) ^ rr(b, 19) ^ (b >>> 10))) | 0; }
        const a = h[0], e = h[4];
        const t1 = h[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & h[5]) ^ (~e & h[6])) + K[i] + w[i];
        const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & h[1]) ^ (a & h[2]) ^ (h[1] & h[2]));
        h.unshift((t1 + t2) | 0); h[4] = (h[4] + t1) | 0; h.pop();
      }
      for (let i = 0; i < 8; i++) H[i] = (H[i] + h[i]) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), ms); }

  /* ---------- Sessão ---------- */
  async function isLogged() {
    if (online) { const { data } = await sb.auth.getSession(); return !!(data && data.session); }
    return ss.get(SESSION_KEY) === '1';
  }
  const emailFor = (user) => (user.includes('@') ? user : (user.toLowerCase() === 'admin' ? cfg.adminEmail : `${user}@duhbikepoint.com.br`));

  /* ---------- Estado do painel ---------- */
  let tab = 'geral', dirty = false, listsDirty = false, saving = false;
  const panel = () => $('#cms'), body = () => $('#cmsBody'), status = () => $('#cmsStatus');
  function markDirty(lists) { dirty = true; if (lists) listsDirty = true; status().textContent = 'Alterações não salvas'; status().classList.add('is-dirty'); }
  function markClean() { dirty = false; listsDirty = false; status().textContent = online ? 'Publicado' : 'Salvo neste navegador'; status().classList.remove('is-dirty'); }

  /* ---------- Abertura ---------- */
  async function openCMS() {
    if (await isLogged()) return showPanel();
    const L = $('#cmsLogin'); L.hidden = false; $('#cmsLoginError').textContent = '';
    $('#cmsLoginMode').textContent = online ? 'Entre para editar e publicar o site.' : 'Modo local: edições ficam salvas neste navegador.';
    window.lenis && lenis.stop(); Effects.closeMenu(true);
    setTimeout(() => $('#cmsLoginForm').user.focus(), 60);
  }
  function closeLogin() { $('#cmsLogin').hidden = true; $('#cmsLoginForm').reset(); window.lenis && lenis.start(); }

  let fails = 0, lockedUntil = 0;
  async function onLogin(e) {
    e.preventDefault();
    const f = e.currentTarget, err = $('#cmsLoginError'), btn = $('#cmsLoginBtn');
    if (Date.now() < lockedUntil) { err.textContent = `Muitas tentativas. Aguarde ${Math.ceil((lockedUntil - Date.now()) / 1000)}s.`; return; }
    const user = f.user.value.trim(), pass = f.pass.value;
    btn.disabled = true; btn.textContent = 'Entrando…'; err.textContent = '';
    let ok = false, msg = 'Usuário ou senha incorretos.';
    try {
      if (online) {
        const { error } = await sb.auth.signInWithPassword({ email: emailFor(user), password: pass });
        ok = !error; if (error && !/invalid/i.test(error.message)) msg = error.message;
      } else {
        const a = localAuth(); ok = user === a.user && (await sha256(`duhbikepoint::${user}::${pass}`)) === a.hash;
        if (ok) ss.set(SESSION_KEY, '1');
      }
    } catch (ex) { msg = 'Falha de conexão. Tente de novo.'; }
    btn.disabled = false; btn.textContent = 'Entrar';
    if (ok) { fails = 0; closeLogin(); showPanel(); toast('Bem-vindo ao painel ✦'); return; }
    fails++; if (fails >= 5) { lockedUntil = Date.now() + 30000; fails = 0; }
    err.textContent = msg;
    const card = $('.cms-login__card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  }

  function showPanel() {
    panel().hidden = false; panel().classList.remove('is-min');
    $('#cmsMode').textContent = online ? '● online' : '● local';
    markClean(); renderTab();
  }
  async function logout() {
    if (dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    if (online && sessionUploads.size) { Store.data = Store.clone(published); await cleanupStorage(new Set(sessionUploads)); sessionUploads.clear(); }
    if (online) await sb.auth.signOut(); ss.del(SESSION_KEY);
    panel().hidden = true; toast('Sessão encerrada');
    if (dirty) { dirty = false; location.reload(); }
  }

  /* ---------- Formulários ---------- */
  const field = (label, path, type = 'text', hint = '') => {
    const v = Store.get(path) ?? '';
    if (type === 'image-single') return `<div class="field"><span>${label}</span>${v ? `<img src="${esc(v)}" alt="" style="width:88px;height:88px;object-fit:contain;border-radius:50%;background:var(--ink-950);margin-bottom:6px">` : ''}
      <div class="cms-row" style="justify-content:flex-start"><label class="cms-btn">Trocar imagem<input type="file" accept="image/png,image/webp,image/jpeg" hidden data-img="${path}" data-keep-alpha="1"></label></div><small class="muted">Use PNG com fundo transparente.</small></div>`;
    const input = type === 'textarea' ? `<textarea data-path="${path}">${esc(v)}</textarea>` : `<input type="${type}" data-path="${path}" value="${esc(v)}">`;
    return `<label class="field"><span>${label}</span>${input}${hint ? `<small class="muted">${hint}</small>` : ''}</label>`;
  };
  function listEditor(key, fields, noun) {
    const arr = Store.get(key) || [];
    return arr.map((item, i) => `
      <div class="cms-item">
        <div class="cms-item__bar"><span class="mono">#${i + 1}</span>
          <span><button class="cms-btn" data-move="${key}:${i}:-1" aria-label="Subir">↑</button> <button class="cms-btn" data-move="${key}:${i}:1" aria-label="Descer">↓</button> <button class="cms-btn cms-btn--danger" data-del="${key}:${i}">Remover</button></span></div>
        ${fields.map(([label, f, type]) => type === 'image'
          ? `<div class="field"><span>${label}</span>${item[f] ? `<img src="${esc(item[f])}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;margin-bottom:6px">` : ''}
              <div class="cms-row" style="justify-content:flex-start"><label class="cms-btn">${item[f] ? 'Trocar imagem' : 'Enviar imagem'}<input type="file" accept="image/*" hidden data-img="${key}.${i}.${f}"></label>${item[f] ? `<button class="cms-btn cms-btn--danger" data-clear="${key}.${i}.${f}">Remover</button>` : ''}</div></div>`
          : type === 'icon'
          ? `<label class="field"><span>${label}</span><select data-path="${key}.${i}.${f}">${Object.keys(Render.ICONS).map((k) => `<option ${item[f] === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>`
          : field(label, `${key}.${i}.${f}`, type || 'text')).join('')}
      </div>`).join('') + `<button class="btn btn--ghost btn--sm" data-add="${key}" style="width:100%">+ Adicionar ${noun}</button>`;
  }
  function simpleList(key, noun) {
    const arr = Store.get(key) || [];
    return arr.map((v, i) => `<div class="cms-row" style="margin-bottom:8px"><input class="cms-input" style="flex:1;min-width:0" data-path="${key}.${i}" value="${esc(v)}">
      <button class="cms-btn" data-move="${key}:${i}:-1" aria-label="Subir">↑</button><button class="cms-btn" data-move="${key}:${i}:1" aria-label="Descer">↓</button><button class="cms-btn cms-btn--danger" data-del="${key}:${i}" aria-label="Remover">✕</button></div>`).join('')
      + `<button class="btn btn--ghost btn--sm" data-addtext="${key}" style="width:100%">+ Adicionar ${noun}</button>`;
  }
  const badge = () => `<span class="cms-badge ${online ? 'is-online' : ''}">${online ? 'Conectado ao Supabase — salvar publica na hora' : 'Modo local — Supabase não configurado'}</span>`;

  const TABS = {
    geral: () => `${badge()}
      <h4>Marca e contato</h4>
      ${field('Nome', 'brand.name')}${field('Slogan', 'brand.tagline')}
      ${field('WhatsApp (só números, com DDI)', 'brand.whatsapp', 'tel', 'Ex.: 5511965478027')}
      ${field('Telefone exibido', 'brand.phoneLabel')}${field('Instagram (sem @)', 'brand.instagram')}
      ${field('Endereço', 'brand.address')}${field('Bairro / cidade', 'brand.district')}${field('Horário de atendimento', 'brand.hours')}
      ${field('Logo', 'brand.logo', 'image-single')}
      <h4>Google e redes (SEO)</h4>
      ${field('Título da aba / Google', 'seo.title')}${field('Descrição no Google', 'seo.description', 'textarea')}
      <h4>Topo da página</h4>
      ${field('Selo', 'hero.eyebrow')}${field('Título — linha 1', 'hero.title1')}${field('Título — linha 2 (contorno verde)', 'hero.title2')}
      ${field('Texto de apoio', 'hero.lead', 'textarea')}${field('Botão principal', 'hero.cta')}${field('Botão secundário', 'hero.cta2')}
      <h4>A oficina</h4>
      ${field('Rótulo', 'about.kicker')}${field('Título', 'about.title', 'textarea')}${field('Texto', 'about.text', 'textarea')}
      <h4>Chamada final</h4>
      ${field('Título', 'cta.title')}${field('Texto', 'cta.text', 'textarea')}`,
    textos: () => `
      <h4>Títulos das seções</h4><p class="hint">Rótulo verde (pequeno) e título de cada seção.</p>
      ${field('Montagem — rótulo', 'sections.bike.kicker')}${field('Montagem — título', 'sections.bike.title')}
      ${field('Serviços — rótulo', 'sections.services.kicker')}${field('Serviços — título', 'sections.services.title', 'textarea')}
      ${field('Modalidades — rótulo', 'sections.disciplines.kicker')}${field('Modalidades — título', 'sections.disciplines.title')}
      ${field('Como funciona — rótulo', 'sections.process.kicker')}${field('Como funciona — título', 'sections.process.title')}
      ${field('Galeria — rótulo', 'sections.gallery.kicker')}${field('Galeria — título', 'sections.gallery.title')}${field('Galeria — dica', 'sections.gallery.hint')}
      ${field('Avaliações — rótulo', 'sections.reviews.kicker')}
      ${field('Contato — rótulo', 'sections.contact.kicker')}${field('Contato — título', 'sections.contact.title')}
      ${field('Menu — rótulo do contato', 'sections.menu.kicker')}${field('Botão final', 'sections.cta.button')}
      <h4 style="margin-top:24px">Etapas da montagem (bike 3D)</h4><p class="hint">São 5 etapas, ligadas às fases da animação.</p>
      ${(Store.get('sections.bike.steps') || []).map((st, i) => `<div class="cms-item"><span class="mono">Etapa ${i + 1}</span>${field('Título', `sections.bike.steps.${i}.title`)}${field('Texto', `sections.bike.steps.${i}.text`, 'textarea')}</div>`).join('')}
      <h4 style="margin-top:24px">Faixa verde (letreiro)</h4>${simpleList('marquee', 'item')}
      <h4 style="margin-top:24px">Etiquetas do topo</h4>${simpleList('chips', 'etiqueta')}`,
    servicos: () => `<h4>Serviços</h4><p class="hint">Cards 3D da seção Serviços.</p>${listEditor('services', [['Ícone', 'icon', 'icon'], ['Título', 'title'], ['Descrição', 'text', 'textarea']], 'serviço')}`,
    galeria: () => {
      const g = Store.get('gallery') || [];
      return `<h4>Galeria 3D</h4><p class="hint">${online ? 'Fotos vão para o Supabase Storage.' : 'Fotos ficam salvas no navegador (limite ~5 MB).'} Ideal: 6 a 10 fotos verticais.</p>
      <div class="cms-gal">${g.map((it, i) => `
        <div class="cms-item"><img src="${esc(it.src)}" alt="">
          ${field('Descrição', `gallery.${i}.alt`)}
          <label class="cms-btn" style="display:block;text-align:center;margin-bottom:6px">Trocar foto<input type="file" accept="image/*" hidden data-img="gallery.${i}.src"></label>
          <div class="cms-row"><button class="cms-btn" data-move="gallery:${i}:-1" aria-label="Mover para trás">←</button><button class="cms-btn" data-move="gallery:${i}:1" aria-label="Mover para frente">→</button><button class="cms-btn cms-btn--danger" data-del="gallery:${i}" aria-label="Remover">✕</button></div>
        </div>`).join('')}</div>
      <label class="btn btn--primary btn--sm" style="width:100%;margin-top:12px">+ Enviar fotos<input type="file" id="galUpload" accept="image/*" multiple hidden></label>
      <div class="cms-row" style="margin-top:10px"><input class="cms-input" style="flex:2;min-width:160px" id="galUrl" placeholder="https://… URL da imagem"><button class="btn btn--ghost btn--sm" id="galUrlAdd">Adicionar URL</button></div>`;
    },
    extras: () => `
      <h4>Modalidades</h4><p class="hint">A imagem fica de fundo no card. Ideal: foto horizontal.</p>${listEditor('disciplines', [['Imagem de fundo', 'image', 'image'], ['Número', 'tag'], ['Título', 'title'], ['Texto', 'text', 'textarea']], 'modalidade')}
      <h4 style="margin-top:24px">Como funciona</h4>${listEditor('process', [['Título', 'title'], ['Texto', 'text', 'textarea']], 'etapa')}`,
    avaliacoes: () => `
      <h4>Resumo do Google</h4>
      ${field('Título da seção', 'reviews.title')}${field('Nota (ex.: 5,0)', 'reviews.rating')}${field('Total de avaliações', 'reviews.count')}
      ${field('Link “Ver no Google”', 'reviews.url', 'url')}${field('Link “Avaliar”', 'reviews.writeUrl', 'url')}
      <h4 style="margin-top:24px">Avaliações exibidas</h4>
      <p class="hint">Copie as avaliações do perfil do Google (nome, nota e texto). ${(cfg.reviewsFunction ? 'As avaliações automáticas do Google aparecem junto com estas.' : '')}</p>
      ${listEditor('reviews.items', [['Nome', 'author'], ['Nota (1 a 5)', 'rating', 'number'], ['Quando (ex.: há 2 meses)', 'date'], ['Avaliação', 'text', 'textarea']], 'avaliação')}`,
    publicar: () => `${badge()}
      ${online ? '<p class="hint">Cada “Salvar e publicar” já atualiza o site para todos os visitantes.</p>' : `
      <h4>Publicar (modo local)</h4>
      <p class="hint">Baixe o <code>content.js</code> e substitua <code>js/content.js</code> na hospedagem. Ou configure o Supabase em <code>js/config.js</code> para publicar direto.</p>
      <button class="btn btn--primary" id="dlContent" style="width:100%">Baixar content.js</button>`}
      <h4 style="margin-top:24px">Backup</h4>
      <div class="cms-row"><button class="btn btn--ghost btn--sm" id="dlJson">Exportar JSON</button>
      <label class="btn btn--ghost btn--sm">Importar JSON<input type="file" id="upJson" accept="application/json,.json" hidden></label></div>
      <h4 style="margin-top:24px">Restaurar padrão</h4>
      <p class="hint">${online ? 'Carrega o conteúdo original de content.js no painel. Só vale depois de Salvar.' : 'Descarta as edições deste navegador.'}</p>
      <button class="btn btn--ghost btn--sm cms-btn--danger" id="resetDraft" style="width:100%">Restaurar conteúdo padrão</button>`,
    conta: () => `
      <h4>Trocar senha</h4>
      <p class="hint">Usuário: <code>admin</code>${online ? ` (${esc(cfg.adminEmail)})` : ''}. ${online ? 'A nova senha vale em qualquer dispositivo.' : 'Modo local: vale só neste navegador.'}</p>
      <label class="field"><span>Nova senha (mín. 6 caracteres)</span><input id="accPass" type="password" autocomplete="new-password"></label>
      <label class="field"><span>Confirmar nova senha</span><input id="accPass2" type="password" autocomplete="new-password"></label>
      <button class="btn btn--primary btn--sm" id="accSave" style="width:100%">Salvar nova senha</button>`
  };
  function renderTab() { body().innerHTML = TABS[tab](); body().scrollTop = 0; }

  /* ---------- Imagens ---------- */
  function compress(file, max = 1400, q = 0.84, type = 'image/jpeg') {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), type, q);
      };
      img.onerror = rej; img.src = url;
    });
  }
  const blobToDataURL = (b) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  async function uploadImage(file, keepAlpha) {
    const blob = await compress(file, keepAlpha ? 512 : (online ? 1400 : 1000), online ? 0.84 : 0.8, keepAlpha ? 'image/png' : 'image/jpeg');
    if (!online) return blobToDataURL(blob);
    const ext = blob.type === 'image/png' ? 'png' : 'jpg';
    const path = `${keepAlpha ? 'brand' : 'gallery'}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from(cfg.bucket).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
    if (error) throw error;
    const url = sb.storage.from(cfg.bucket).getPublicUrl(path).data.publicUrl;
    sessionUploads.add(url);
    return url;
  }
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast(`${name} baixado`);
  }

  /* ---------- Limpeza do Storage: só ficam arquivos usados pelo conteúdo ---------- */
  const sessionUploads = new Set();
  let published = Store.clone(Store.data);
  const bucketPrefix = () => (online ? `${cfg.supabaseUrl}/storage/v1/object/public/${cfg.bucket}/` : '\u0000');
  function storageUrls(obj, out = new Set()) {
    if (typeof obj === 'string') { if (obj.startsWith(bucketPrefix())) out.add(obj); }
    else if (obj && typeof obj === 'object') Object.values(obj).forEach((v) => storageUrls(v, out));
    return out;
  }
  async function cleanupStorage(candidates) {
    if (!online) return 0;
    const used = storageUrls(Store.data);
    const paths = [...candidates].filter((u) => !used.has(u)).map((u) => decodeURIComponent(u.slice(bucketPrefix().length).split('?')[0]));
    if (!paths.length) return 0;
    const { error } = await sb.storage.from(cfg.bucket).remove(paths);
    if (error) { console.warn('[CMS] limpeza do Storage', error); return 0; }
    return paths.length;
  }

  /* ---------- Salvar ---------- */
  async function save() {
    if (saving) return; saving = true;
    const btn = $('#cmsSave'); btn.disabled = true; btn.textContent = online ? 'Publicando…' : 'Salvando…';
    try {
      await Store.save();
      const candidates = new Set([...storageUrls(published), ...sessionUploads]);
      const removed = await cleanupStorage(candidates);
      sessionUploads.clear(); published = Store.clone(Store.data);
      const reload = listsDirty; markClean();
      toast((online ? 'Publicado no site ✓' : 'Salvo neste navegador ✓') + (removed ? ` · ${removed} arquivo(s) antigo(s) apagado(s)` : ''));
      if (reload) { ss.set(REOPEN_KEY, tab); setTimeout(() => location.reload(), 600); }
    } catch (e) {
      console.error(e);
      toast(/row-level|permission|JWT|401|403/i.test(e.message || '') ? 'Sem permissão: este usuário não é administrador.' : ('Erro ao salvar: ' + (e.message || e)), 4500);
    } finally { saving = false; btn.disabled = false; btn.textContent = 'Salvar e publicar'; }
  }

  /* ---------- Eventos ---------- */
  const BLANK = {
    services: { icon: 'wrench', title: 'Novo serviço', text: 'Descrição do serviço.' },
    disciplines: { tag: '0X', title: 'Nova', text: 'Descrição.', image: '' },
    process: { title: 'Nova etapa', text: 'Descrição.' },
    'reviews.items': { author: 'Nome do cliente', rating: '5', date: '', text: '' }
  };
  function bind() {
    // duplo clique / duplo toque no logo
    const logo = $('#brandLogo'); let clickT = null, lastTap = 0, lastTouch = 0;
    logo.addEventListener('click', () => {
      if (Date.now() - lastTouch < 600) return; // já tratado no touch
      clearTimeout(clickT); clickT = setTimeout(() => window.scrollToTarget ? scrollToTarget(0) : scrollTo({ top: 0, behavior: 'smooth' }), 280);
    });
    logo.addEventListener('dblclick', (e) => { e.preventDefault(); clearTimeout(clickT); openCMS(); });
    logo.addEventListener('touchend', (e) => {
      const now = Date.now(); lastTouch = now; e.preventDefault();
      if (now - lastTap < 350) { clearTimeout(clickT); lastTap = 0; openCMS(); }
      else { lastTap = now; clearTimeout(clickT); clickT = setTimeout(() => window.scrollToTarget ? scrollToTarget(0) : scrollTo({ top: 0, behavior: 'smooth' }), 360); }
    }, { passive: false });

    const L = $('#cmsLogin');
    L.addEventListener('click', (e) => { if (e.target === L || e.target.closest('[data-close]')) closeLogin(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !L.hidden) closeLogin(); });
    $('#cmsLoginForm').addEventListener('submit', onLogin);

    $('#cmsMin').addEventListener('click', () => panel().classList.toggle('is-min'));
    $('#cmsLogout').addEventListener('click', logout);
    $('#cmsSave').addEventListener('click', save);
    $$('.cms__tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab; $$('.cms__tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b))); renderTab();
    }));
    addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !panel().hidden) { e.preventDefault(); save(); } });
    addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

    const B = body();
    B.addEventListener('input', (e) => {
      const p = e.target.dataset && e.target.dataset.path; if (!p) return;
      Store.set(p, e.target.value);
      const isList = /^(services|gallery|disciplines|process|reviews\.items|marquee|chips|sections\.bike\.steps)\./.test(p) || /title$|kicker$/.test(p) || p.startsWith('seo.');
      markDirty(isList);
      if (!isList) { $$(`[data-cms="${p}"]`).forEach((el) => (el.textContent = e.target.value)); Render.links(); }
    });
    B.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.addtext) { const a = Store.get(t.dataset.addtext) || []; a.push('Novo'); Store.set(t.dataset.addtext, a); markDirty(true); renderTab(); return; }
      if (t.dataset.add) { const k = t.dataset.add; const a = Store.get(k) || []; a.push(Store.clone(BLANK[k])); Store.set(k, a); markDirty(true); renderTab(); return; }
      if (t.dataset.del) { const [k, i] = t.dataset.del.split(':'); if (!confirm('Remover este item?')) return; Store.get(k).splice(+i, 1); markDirty(true); renderTab(); return; }
      if (t.dataset.clear) { if (!confirm('Remover esta imagem?')) return; Store.set(t.dataset.clear, ''); markDirty(true); renderTab(); return; }
      if (t.dataset.move) { const [k, i, d] = t.dataset.move.split(':'); const a = Store.get(k), j = +i + +d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; markDirty(true); renderTab(); return; }
      if (t.id === 'galUrlAdd') { const u = $('#galUrl').value.trim(); if (!/^(https:\/\/|assets\/)/.test(u)) return toast('Use uma URL https://'); Store.get('gallery').push({ src: u, alt: 'Foto da oficina' }); markDirty(true); renderTab(); return; }
      if (t.id === 'dlContent') return download('content.js', `/* Conteúdo publicado do site. */\nwindow.DEFAULT_CONTENT = ${JSON.stringify(Store.data, null, 2)};\n`, 'text/javascript');
      if (t.id === 'dlJson') return download(`duhbikepoint-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(Store.data, null, 2), 'application/json');
      if (t.id === 'resetDraft') {
        if (!confirm('Restaurar o conteúdo padrão?')) return;
        if (online) { Store.data = Store.clone(window.DEFAULT_CONTENT); markDirty(true); renderTab(); toast('Padrão carregado — clique em Salvar para publicar'); }
        else { Store.resetLocal(); dirty = false; ss.set(REOPEN_KEY, 'publicar'); location.reload(); }
        return;
      }
      if (t.id === 'accSave') {
        const p1 = $('#accPass').value, p2 = $('#accPass2').value;
        if (p1.length < 6) return toast('A senha precisa de 6+ caracteres');
        if (p1 !== p2) return toast('As senhas não conferem');
        t.disabled = true;
        try {
          if (online) { const { error } = await sb.auth.updateUser({ password: p1 }); if (error) throw error; }
          else Store.safeSet(AUTH_KEY, JSON.stringify({ user: 'admin', hash: await sha256(`duhbikepoint::admin::${p1}`) }));
          $('#accPass').value = ''; $('#accPass2').value = ''; toast('Senha alterada ✓');
        } catch (ex) { toast('Não foi possível trocar: ' + (ex.message || ex), 4500); }
        t.disabled = false;
      }
    });
    B.addEventListener('change', async (e) => {
      if (e.target.dataset && e.target.dataset.img) {
        const f = e.target.files[0]; if (!f) return;
        toast('Enviando imagem…', 10000);
        try { Store.set(e.target.dataset.img, await uploadImage(f, e.target.dataset.keepAlpha === '1')); markDirty(true); renderTab(); toast('Imagem trocada — clique em Salvar'); }
        catch (err) { console.error(err); toast('Falha ao enviar: ' + (err.message || ''), 4500); }
        return;
      }
      if (e.target.id === 'galUpload') {
        const files = [...e.target.files]; if (!files.length) return;
        toast(`Enviando ${files.length} foto(s)…`, 10000);
        let okN = 0;
        for (const f of files) {
          try { Store.get('gallery').push({ src: await uploadImage(f), alt: f.name.replace(/\.[^.]+$/, '') }); okN++; }
          catch (err) { console.error(err); toast('Falha ao enviar ' + f.name + ': ' + (err.message || ''), 4500); }
        }
        if (okN) { markDirty(true); renderTab(); toast(`${okN} foto(s) adicionada(s) — clique em Salvar`); }
      }
      if (e.target.id === 'upJson') {
        const f = e.target.files[0]; if (!f) return;
        try { const data = JSON.parse(await f.text()); if (!data.brand || !data.hero) throw 0; Store.data = data; markDirty(true); renderTab(); toast('Backup importado — clique em Salvar'); }
        catch (err) { toast('Arquivo JSON inválido'); }
      }
    });
  }

  async function init() {
    published = Store.clone(Store.data);
    bind();
    const reopen = ss.get(REOPEN_KEY);
    if (reopen && (await isLogged())) {
      ss.del(REOPEN_KEY); tab = TABS[reopen] ? reopen : 'geral';
      $$('.cms__tabs [data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.tab === tab)));
      showPanel();
    }
  }
  return { init, open: openCMS };
})();
