-- =====================================================================
-- Duh Bike Point — banco do CMS (Supabase)
-- JÁ APLICADO no projeto "duhbikepoint" (bqhqiyngynlslggmujul).
-- Guarde para recriar o banco em outro projeto, se precisar.
-- Leitura do conteúdo: pública. Escrita: apenas administradores (cms_admins).
-- Admin: o usuário do Auth com e-mail admin@duhbikepoint.com.br (igual a adminEmail em js/config.js).
-- =====================================================================

create table if not exists public.site_content (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.site_content enable row level security;
create index if not exists site_content_updated_by_idx on public.site_content(updated_by);

create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.cms_admins enable row level security;

-- Funções auxiliares em schema privado (fora da API pública)
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_cms_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cms_admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_cms_admin() from public, anon;
grant execute on function private.is_cms_admin() to authenticated;

-- site_content
drop policy if exists "conteudo publico" on public.site_content;
create policy "conteudo publico" on public.site_content
  for select to anon, authenticated using (true);
drop policy if exists "admin insere" on public.site_content;
create policy "admin insere" on public.site_content
  for insert to authenticated with check ((select private.is_cms_admin()));
drop policy if exists "admin atualiza" on public.site_content;
create policy "admin atualiza" on public.site_content
  for update to authenticated using ((select private.is_cms_admin())) with check ((select private.is_cms_admin()));

-- cms_admins: cada um só vê a si mesmo; ninguém escreve pela API
drop policy if exists "admin ve a si" on public.cms_admins;
create policy "admin ve a si" on public.cms_admins
  for select to authenticated using (user_id = (select auth.uid()));

-- Usuário criado com o e-mail do admin vira administrador automaticamente
create or replace function private.cms_grant_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(new.email) = 'admin@duhbikepoint.com.br' then
    insert into public.cms_admins (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.cms_grant_admin() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_cms on auth.users;
create trigger on_auth_user_created_cms after insert on auth.users
  for each row execute function private.cms_grant_admin();

insert into public.cms_admins (user_id)
select id from auth.users where lower(email) = 'admin@duhbikepoint.com.br'
on conflict do nothing;

-- Storage: fotos da galeria (leitura pública, escrita só admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin envia midia" on storage.objects;
create policy "admin envia midia" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-media' and (select private.is_cms_admin()));
drop policy if exists "admin altera midia" on storage.objects;
create policy "admin altera midia" on storage.objects
  for update to authenticated using (bucket_id = 'site-media' and (select private.is_cms_admin()));
drop policy if exists "admin apaga midia" on storage.objects;
create policy "admin apaga midia" on storage.objects
  for delete to authenticated using (bucket_id = 'site-media' and (select private.is_cms_admin()));
