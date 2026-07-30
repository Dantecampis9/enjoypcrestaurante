-- =====================================================================
-- Enjoy PC Restaurante — Esquema del panel de administración
--
-- Ejecutar UNA vez en: Supabase Dashboard > SQL Editor > New query
-- Orden: 01-schema.sql -> 02-rls.sql -> 03-storage.sql -> 04-seed.sql
--
-- IMPORTANTE: este script NO activa RLS. Hasta que no ejecutes
-- 02-rls.sql, las tablas quedan expuestas. No dejes el proyecto a medias.
-- =====================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- Helper: mantiene updated_at al día automáticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Lista blanca de administradores.
-- No basta con estar autenticado en Supabase: hay que estar en esta tabla.
-- Se puebla a mano por SQL (ver paso 9 del README de instalación).
-- ---------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER para que las políticas RLS puedan consultar `admins`
-- sin que el usuario necesite acceso directo a esa tabla. Solo devuelve
-- un boolean sobre quien llama, así que no filtra información de nadie.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Categorías del menú.
-- `id` es text (slug) a propósito: conserva continuidad con los
-- data-cat="..." que ya usa menu.html y con MENU_CATEGORIES.
-- Las 6 categorías son fijas: el panel no permite crearlas ni borrarlas.
-- ---------------------------------------------------------------------
create table public.menu_categories (
  id         text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  label_es   text not null check (char_length(label_es) between 1 and 60),
  label_en   text not null check (char_length(label_en) between 1 and 60),
  orden      smallint not null default 0,
  activo     boolean  not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Platos
-- ---------------------------------------------------------------------
create table public.menu_items (
  id         uuid primary key default gen_random_uuid(),
  -- `slug` solo existe para que 04-seed.sql sea re-ejecutable sin duplicar.
  -- El panel no lo muestra ni lo usa.
  slug       text unique,
  category   text not null
             references public.menu_categories(id)
             on update cascade on delete restrict,
  nombre_es  text not null check (char_length(nombre_es) between 1 and 120),
  nombre_en  text not null check (char_length(nombre_en) between 1 and 120),
  desc_es    text not null default '' check (char_length(desc_es) <= 400),
  desc_en    text not null default '' check (char_length(desc_en) <= 400),
  precio     numeric(8,2) not null default 0 check (precio >= 0),
  -- Acepta indistintamente una ruta local ("img/platos/steak.jpg") o una
  -- URL completa de Supabase Storage. Así las fotos existentes siguen
  -- funcionando sin conexión y las nuevas van a Storage.
  img        text not null default '' check (char_length(img) <= 600),
  tags       text[] not null default '{}'::text[]
             check (tags <@ array['vegano','estrella']::text[]),
  orden      smallint not null default 0,
  activo     boolean  not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_category_orden_idx
  on public.menu_items (category, orden, id);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Eventos: horario semanal recurrente.
--
-- NO hay restricción UNIQUE sobre `dia`: se permiten varios eventos el
-- mismo día y días sin ningún evento. `orden` desempata cuando hay
-- varios el mismo día.
-- ---------------------------------------------------------------------
create table public.events_weekly (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique,                  -- idempotencia del seed, igual que arriba
  dia         smallint not null check (dia between 0 and 6),   -- 0=domingo (Date.getDay())
  nombre_es   text not null check (char_length(nombre_es) between 1 and 120),
  nombre_en   text not null check (char_length(nombre_en) between 1 and 120),
  desc_es     text not null default '' check (char_length(desc_es) <= 400),
  desc_en     text not null default '' check (char_length(desc_en) <= 400),
  hora_inicio time not null default '19:00',
  hora_fin    time not null default '22:00',
  img         text not null default '' check (char_length(img) <= 600),
  orden       smallint not null default 0,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- OJO: deliberadamente NO existe check (hora_fin > hora_inicio).
-- Un evento de 22:00 a 01:00 es normal en un restaurante y ese check lo
-- bloquearía. El panel muestra un aviso, pero no lo impide.

create index events_weekly_dia_idx
  on public.events_weekly (dia, orden, hora_inicio);

create trigger events_weekly_set_updated_at
  before update on public.events_weekly
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Suscriptores capturados por el modal de bienvenida.
--
-- Esta tabla recibe INSERT desde internet sin autenticación (es el
-- requisito: el visitante no tiene cuenta). Por eso los CHECK son
-- estrictos: son la primera barrera contra basura y bots torpes.
-- La lectura está restringida a administradores en 02-rls.sql.
-- ---------------------------------------------------------------------
create table public.leads (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null check (char_length(nombre) between 1 and 120),
  email      text not null check (
               char_length(email) <= 255
               and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
             ),
  telefono   text not null check (
               char_length(telefono) between 7 and 20
               and telefono ~ '^[0-9+()\s-]+$'
             ),
  idioma     text check (idioma in ('es','en')),
  origen     text check (char_length(origen) <= 120),   -- p.ej. "menu.html", "mikrotik-hotspot"
  created_at timestamptz not null default now()
);

create index leads_created_at_idx  on public.leads (created_at desc);
create index leads_email_lower_idx on public.leads (lower(email));
