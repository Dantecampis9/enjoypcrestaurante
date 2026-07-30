-- =====================================================================
-- Enjoy PC Restaurante — Row Level Security
--
-- Ejecutar DESPUÉS de 01-schema.sql.
--
-- ¿POR QUÉ ESTE ARCHIVO ES EL MÁS IMPORTANTE?
--
-- La `anon key` de Supabase va literalmente escrita en el HTML público
-- (js/supabase-config.js). Cualquiera la lee con Ctrl+U. Eso es normal y
-- es su diseño: identifica el proyecto, NO es un secreto.
--
-- Lo único que impide que un visitante haga `DELETE FROM menu_items` o
-- `SELECT * FROM leads` son las dos capas que monta este script:
--   1. Los GRANT de Postgres al rol `anon`.
--   2. Las políticas RLS.
--
-- Supabase aplica por defecto `GRANT ALL ON TABLES TO anon, authenticated`
-- a las tablas nuevas del esquema public. Es decir: una tabla recién
-- creada SIN RLS es leíble y escribible por cualquiera en internet.
-- Por eso este script empieza revocando todo explícitamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Activar RLS en las 5 tablas
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.events_weekly   enable row level security;
alter table public.leads           enable row level security;

-- `force` hace que RLS se aplique incluso al dueño de la tabla.
-- Blindaje extra frente a conexiones con roles privilegiados.
alter table public.admins          force row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items      force row level security;
alter table public.events_weekly   force row level security;
alter table public.leads           force row level security;

-- ---------------------------------------------------------------------
-- 2. Reset de permisos: partir de cero
-- ---------------------------------------------------------------------
revoke all on public.admins, public.menu_categories, public.menu_items,
              public.events_weekly, public.leads
  from anon, authenticated;

-- Contenido público: lectura para todos
grant select on public.menu_categories, public.menu_items, public.events_weekly
  to anon, authenticated;

-- Escritura del contenido: solo usuarios logueados.
-- Las políticas de abajo afinan esto a "logueado Y en la tabla admins".
grant insert, update, delete
  on public.menu_categories, public.menu_items, public.events_weekly
  to authenticated;

-- LEADS: `anon` SOLO puede insertar. Nunca SELECT, ni siquiera a nivel
-- de GRANT. Un visitante jamás debe poder leer los correos de otros.
grant insert on public.leads to anon;
grant insert, select, delete on public.leads to authenticated;

-- ADMINS: sin acceso alguno desde el frontend. Se puebla por SQL Editor
-- (que usa service_role y por tanto ignora RLS).

-- ---------------------------------------------------------------------
-- 3. Políticas: contenido público
-- ---------------------------------------------------------------------

-- Categorías
create policy "categorias_lectura_publica"
  on public.menu_categories for select to anon, authenticated
  using (activo = true);

create policy "categorias_escritura_admin"
  on public.menu_categories for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Platos
create policy "platos_lectura_publica"
  on public.menu_items for select to anon, authenticated
  using (activo = true);

create policy "platos_escritura_admin"
  on public.menu_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Eventos
create policy "eventos_lectura_publica"
  on public.events_weekly for select to anon, authenticated
  using (activo = true);

create policy "eventos_escritura_admin"
  on public.events_weekly for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Políticas: leads (suscriptores) — asimétrico a propósito
-- ---------------------------------------------------------------------

-- INSERT público: el modal de bienvenida debe funcionar sin sesión.
-- El WITH CHECK vuelve a validar la forma del dato; RLS también sirve
-- para esto, no solo para control de acceso.
create policy "leads_insert_publico"
  on public.leads for insert to anon, authenticated
  with check (
    char_length(nombre) between 1 and 120
    and char_length(email) <= 255
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(telefono) between 7 and 20
    and telefono ~ '^[0-9+()\s-]+$'
  );

-- SELECT: SOLO administradores.
-- Nótese que NO existe ninguna política de SELECT para `anon`, y además
-- `anon` tampoco tiene GRANT SELECT. Doble barrera intencionada.
create policy "leads_lectura_admin"
  on public.leads for select to authenticated
  using (public.is_admin());

create policy "leads_borrado_admin"
  on public.leads for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. Políticas: admins (solo lectura de la propia fila)
-- ---------------------------------------------------------------------
grant select on public.admins to authenticated;

create policy "admins_ve_su_propia_fila"
  on public.admins for select to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- ⚠️  ADVERTENCIA SOBRE LA `service_role` KEY
--
-- La `service_role` key (o la nueva `secret key`, sb_secret_...) IGNORA
-- POR COMPLETO todo lo que hay en este archivo. Quien la tenga puede
-- leer todos los correos, borrar el menú entero y crear administradores.
-- Es equivalente a la contraseña de la base de datos.
--
-- NUNCA debe aparecer en js/supabase-config.js, en admin.html, ni en
-- ningún archivo del repositorio o servido al navegador.
--
-- En Supabase Dashboard > Settings > API se muestran ambas claves.
-- Copia SOLO la que dice `anon` / `public` / `publishable`.
--
-- Los bots que escanean GitHub encuentran una service_role filtrada en
-- cuestión de minutos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 6. Comprobación rápida tras ejecutar este script
-- ---------------------------------------------------------------------
-- Las 5 tablas deben aparecer con rowsecurity = true:
--
--   select tablename, rowsecurity
--     from pg_tables
--    where schemaname = 'public'
--    order by tablename;
--
-- Si alguna sale en false, PARA y arréglalo antes de seguir.
