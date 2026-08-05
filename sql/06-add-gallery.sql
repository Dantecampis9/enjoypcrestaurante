-- =====================================================================
-- Enjoy PC Restaurante — Migración: gestión de galería (fotos + video)
--
-- Ejecutar UNA vez en un proyecto que YA tiene 01-04 aplicados (si estás
-- montando el proyecto desde cero, no hace falta este archivo: 01, 02,
-- 03 y 04 ya incluyen la galería desde el principio).
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------
create table if not exists public.gallery_items (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique,
  tipo       text not null default 'imagen' check (tipo in ('imagen','video')),
  archivo    text not null check (char_length(archivo) between 1 and 600),
  alt_es     text not null default '' check (char_length(alt_es) <= 200),
  alt_en     text not null default '' check (char_length(alt_en) <= 200),
  orden      smallint not null default 0,
  activo     boolean  not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gallery_items_orden_idx on public.gallery_items (orden, id);

drop trigger if exists gallery_items_set_updated_at on public.gallery_items;
create trigger gallery_items_set_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RLS — mismo patrón que menu_items/events_weekly: lectura pública
-- de lo activo, escritura solo administradores.
-- ---------------------------------------------------------------------
alter table public.gallery_items enable row level security;
alter table public.gallery_items force row level security;

revoke all on public.gallery_items from anon, authenticated;
grant select on public.gallery_items to anon, authenticated;
grant insert, update, delete on public.gallery_items to authenticated;

drop policy if exists "galeria_lectura_publica" on public.gallery_items;
create policy "galeria_lectura_publica"
  on public.gallery_items for select to anon, authenticated
  using (activo = true);

drop policy if exists "galeria_escritura_admin" on public.gallery_items;
create policy "galeria_escritura_admin"
  on public.gallery_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. Storage: subir el límite del bucket para admitir video corto
-- formato smartphone. Antes solo aceptaba imágenes hasta 5 MB.
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit    = 52428800,   -- 50 MB por archivo (ver sql/03-storage.sql)
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/avif',
      'video/mp4','video/quicktime','video/webm'
    ]
where id = 'media';

-- ---------------------------------------------------------------------
-- 4. Seed: las 18 fotos que ya estaban hardcodeadas en galeria.html.
-- Idempotente (on conflict), no duplica si ya lo corriste antes.
-- ---------------------------------------------------------------------
insert into public.gallery_items (slug, tipo, archivo, alt_es, alt_en, orden) values
  ('g01-hero-terraza', 'imagen', 'img/ambiente/hero-terraza-noche.jpg',
   'Terraza iluminada de noche en Enjoy Punta Cana', 'Terrace lit up at night at Enjoy Punta Cana', 10),
  ('g02-steak', 'imagen', 'img/platos/steak.jpg',
   'Plato de carne a la parrilla', 'Grilled steak', 20),
  ('g03-musica-vivo', 'imagen', 'img/ambiente/musica-vivo.jpg',
   'Música en vivo por la noche', 'Live music at night', 30),
  ('g04-cocteles', 'imagen', 'img/platos/cocteles.jpg',
   'Cócteles de autor', 'Signature cocktails', 40),
  ('g05-ambiente-social-1', 'imagen', 'img/ambiente/ambiente-social-1.jpg',
   'Ambiente social en la terraza', 'Social gathering on the terrace', 50),
  ('g06-pasta-italiana', 'imagen', 'img/platos/pasta-italiana.jpg',
   'Pasta italiana artesanal', 'House-made Italian pasta', 60),
  ('g07-dj-noche', 'imagen', 'img/ambiente/dj-noche.jpg',
   'DJ en vivo por la noche', 'Live DJ at night', 70),
  ('g08-coctel-camarones', 'imagen', 'img/platos/coctel-camarones.jpg',
   'Cóctel de camarones frescos', 'Fresh shrimp cocktail', 80),
  ('g09-bar-noche', 'imagen', 'img/ambiente/bar-noche.jpg',
   'Bar iluminado de noche', 'Bar lit up at night', 90),
  ('g10-cheesecake', 'imagen', 'img/platos/cheesecake.jpg',
   'Cheesecake de la casa', 'House cheesecake', 100),
  ('g11-saxofonista', 'imagen', 'img/ambiente/saxofonista.jpg',
   'Saxofonista en vivo', 'Live saxophonist', 110),
  ('g12-sangria', 'imagen', 'img/platos/sangria.jpg',
   'Sangría de la casa', 'House sangria', 120),
  ('g13-ambiente-social-2', 'imagen', 'img/ambiente/ambiente-social-2.jpg',
   'Ambiente social de noche', 'Evening social gathering', 130),
  ('g14-mamajuana', 'imagen', 'img/platos/mamajuana.jpg',
   'Mamajuana, trago tradicional dominicano', 'Mamajuana, traditional Dominican drink', 140),
  ('g15-boutique', 'imagen', 'img/ambiente/boutique.jpg',
   'Boutique de souvenirs', 'Souvenir boutique', 150),
  ('g16-frutas-frescas', 'imagen', 'img/platos/frutas-frescas.jpg',
   'Frutas frescas de temporada', 'Fresh seasonal fruit', 160),
  ('g17-ambiente-mesa', 'imagen', 'img/ambiente/ambiente-mesa.jpg',
   'Momento compartido en la mesa', 'A moment shared at the table', 170),
  ('g18-coctel-verde', 'imagen', 'img/platos/coctel-verde.jpg',
   'Cóctel tropical verde', 'Tropical green cocktail', 180)

on conflict (slug) do update
  set tipo    = excluded.tipo,
      archivo = excluded.archivo,
      alt_es  = excluded.alt_es,
      alt_en  = excluded.alt_en,
      orden   = excluded.orden;

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public' and tablename = 'gallery_items';  -- rowsecurity debe ser true
-- select count(*) from public.gallery_items;  -- debe dar 18
-- select file_size_limit, allowed_mime_types from storage.buckets where id = 'media';
