/* Configuração do Supabase (CMS online).
   Preencha supabaseUrl e supabaseKey com os dados do projeto (Project Settings → API).
   A chave aqui é a PUBLICÁVEL/anon — ela é pública por natureza; a segurança vem das regras RLS (supabase/setup.sql).
   Com os campos vazios, o CMS funciona em modo local (edições só neste navegador). */
window.SITE_CONFIG = {
  supabaseUrl: 'https://bqhqiyngynlslggmujul.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaHFpeW5neW5sc2xnZ211anVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MzI1MzksImV4cCI6MjExMDQwODUzOX0.ZMW8OjSXDNo-KuBB6o6TwtEPisGayxrQqJKHSs32rkQ',
  adminEmail: 'admin@duhbikepoint.com.br', // o usuário "admin" do login corresponde a este e-mail no Supabase Auth
  bucket: 'site-media',
  contentId: 'main'
};
