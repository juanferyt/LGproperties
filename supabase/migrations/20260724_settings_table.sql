-- Migración: tabla `settings` (clave/valor) que ya usaban:
--   - app/api/settings/route.ts
--   - app/admin/actions.ts (updateUsdRate)
--   - app/admin/page.tsx (lectura de la tasa USD/COP)
-- pero que nunca se había creado en el esquema. Sin esto, el selector de
-- tasa del dólar en el panel administrativo fallaba en silencio (Supabase
-- devuelve error, pero el código no interrumpía la página).
-- No destructiva: usa "if not exists" y no borra ni modifica nada existente.

create table if not exists public.settings (
 key text primary key, value text not null, updated_at timestamptz default now()
);

alter table public.settings enable row level security;

do $$ begin
  create policy "public read settings" on public.settings for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "admins settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;

insert into public.settings(key, value)
values ('usd_to_cop_rate', '4200')
on conflict (key) do nothing;

comment on table public.settings is
  'Configuración simple clave/valor editable desde el panel administrativo (ej. tasa USD/COP para mostrar precios en dólares).';
