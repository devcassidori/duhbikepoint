/* Conteúdo do site: Supabase (quando configurado) → senão rascunho local → senão content.js. */
(function () {
  const KEY = 'duhbp.content.v1';
  const cfg = window.SITE_CONFIG || {};
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function safeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  const online = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
  const sb = online ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'duhbp.auth' } }) : null;

  function withDefaults(data) {
    const base = clone(window.DEFAULT_CONTENT || {});
    if (!data || typeof data !== 'object') return base;
    // completa chaves novas (inclusive aninhadas) sem sobrescrever o que já foi editado
    const fill = (dst, src) => {
      for (const k in src) {
        if (!(k in dst) || dst[k] == null) dst[k] = src[k];
        else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && typeof dst[k] === 'object' && !Array.isArray(dst[k])) fill(dst[k], src[k]);
      }
    };
    fill(data, base);
    return data;
  }

  const Store = {
    KEY, online, sb, cfg,
    data: clone(window.DEFAULT_CONTENT || {}),
    source: 'padrão',
    async load() {
      if (online) {
        try {
          const req = sb.from('site_content').select('data, updated_at').eq('id', cfg.contentId || 'main').maybeSingle();
          const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3500));
          const { data, error } = await Promise.race([req, timeout]);
          if (error) throw error;
          if (data && data.data) { this.data = withDefaults(data.data); this.source = 'supabase'; return; }
          this.source = 'padrão (Supabase vazio)'; return;
        } catch (e) { console.warn('[CMS] Supabase indisponível, usando conteúdo padrão.', e); this.source = 'padrão (offline)'; return; }
      }
      const raw = safeGet(KEY);
      if (raw) { try { this.data = withDefaults(JSON.parse(raw)); this.source = 'rascunho local'; } catch (e) {} }
    },
    get(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this.data); },
    set(path, value) {
      const keys = path.split('.'); let o = this.data;
      keys.slice(0, -1).forEach((k) => { if (o[k] == null) o[k] = {}; o = o[k]; });
      o[keys[keys.length - 1]] = value;
    },
    async save() {
      if (online) {
        const { data: u } = await sb.auth.getUser();
        const { error } = await sb.from('site_content').upsert({ id: cfg.contentId || 'main', data: this.data, updated_at: new Date().toISOString(), updated_by: u && u.user ? u.user.id : null });
        if (error) throw error;
        return true;
      }
      if (!safeSet(KEY, JSON.stringify(this.data))) throw new Error('Sem espaço no navegador — use menos fotos ou fotos menores.');
      return true;
    },
    resetLocal() { safeDel(KEY); this.data = clone(window.DEFAULT_CONTENT); },
    clone, safeGet, safeSet, safeDel
  };
  window.Store = Store;
})();
