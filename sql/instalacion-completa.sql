-- =====================================================================
-- Enjoy PC Restaurante — Instalación completa en un solo script
--
-- Pega este archivo ENTERO en Supabase Dashboard > SQL Editor > New query
-- y pulsa Run una sola vez. Crea las 6 tablas, activa RLS, prepara el
-- bucket de Storage y carga los datos iniciales (21 platos, 7 eventos,
-- 18 fotos de galería) — todo lo que antes eran los archivos separados
-- 01-schema.sql, 02-rls.sql, 03-storage.sql y 04-seed.sql, en orden,
-- en un solo archivo.
--
-- ¿Cuándo usar ESTE archivo en vez de los 01-04 sueltos?
--   - Proyecto Supabase nuevo, recién creado: usa este archivo. Es lo
--     único que necesitas ejecutar (junto con los pasos manuales del
--     panel que se explican en sql/README.md: crear tu usuario admin,
--     desactivar registro público, etc.).
--   - Proyecto que YA tiene 01-04 corridos antes: no vuelvas a correr
--     este archivo completo. Usa las migraciones sueltas que falten:
--     sql/05-add-phone.sql y sql/06-add-gallery.sql. Son idempotentes;
--     este archivo también lo es (ON CONFLICT en todo el seed, CREATE
--     TABLE normal porque asume que la tabla no existe todavía), pero
--     no tiene sentido repetir el trabajo si ya está hecho.
--
-- Los archivos 01-06 originales se conservan en esta carpeta como
-- referencia modular y para las migraciones incrementales — no se
-- eliminan por este archivo.
-- =====================================================================


-- #######################################################################
-- # PARTE 1 — ESQUEMA (antes: 01-schema.sql)
-- #######################################################################

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
-- Se puebla a mano por SQL (ver paso "Crear tu usuario de administrador"
-- en sql/README.md).
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
  -- `slug` solo existe para que el seed sea re-ejecutable sin duplicar.
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
-- Suscriptores capturados por el portal cautivo / formularios de
-- captura de contacto (ver mikrotik/login.html).
--
-- Esta tabla recibe INSERT desde internet sin autenticación (es el
-- requisito: el visitante no tiene cuenta). Por eso los CHECK son
-- estrictos: son la primera barrera contra basura y bots torpes.
-- La lectura está restringida a administradores más abajo.
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

-- ---------------------------------------------------------------------
-- Galería: fotos y videos cortos (formato smartphone, vertical u
-- horizontal — no se fuerza aspect ratio, el masonry de galeria.html
-- se adapta a cualquiera).
--
-- `archivo` acepta, igual que `img` en menu_items/events_weekly, tanto
-- una ruta local ("img/ambiente/foo.jpg") como una URL de Storage.
-- ---------------------------------------------------------------------
create table public.gallery_items (
  id         uuid primary key default gen_random_uuid(),
  -- `slug` solo existe para que el seed sea re-ejecutable sin duplicar.
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

create index gallery_items_orden_idx on public.gallery_items (orden, id);

create trigger gallery_items_set_updated_at
  before update on public.gallery_items
  for each row execute function public.set_updated_at();


-- #######################################################################
-- # PARTE 2 — ROW LEVEL SECURITY (antes: 02-rls.sql)
-- #
-- # La `anon key` de Supabase va literalmente escrita en el HTML público
-- # (js/supabase-config.js). Cualquiera la lee con Ctrl+U. Eso es normal
-- # y es su diseño: identifica el proyecto, NO es un secreto.
-- #
-- # Lo único que impide que un visitante haga `DELETE FROM menu_items` o
-- # `SELECT * FROM leads` son las dos capas que monta esta parte:
-- #   1. Los GRANT de Postgres al rol `anon`.
-- #   2. Las políticas RLS.
-- #
-- # Supabase aplica por defecto `GRANT ALL ON TABLES TO anon, authenticated`
-- # a las tablas nuevas del esquema public. Por eso esta parte empieza
-- # revocando todo explícitamente.
-- #######################################################################

-- ---------------------------------------------------------------------
-- 1. Activar RLS en las 6 tablas
-- ---------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.events_weekly   enable row level security;
alter table public.leads           enable row level security;
alter table public.gallery_items   enable row level security;

-- `force` hace que RLS se aplique incluso al dueño de la tabla.
-- Blindaje extra frente a conexiones con roles privilegiados.
alter table public.admins          force row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items      force row level security;
alter table public.events_weekly   force row level security;
alter table public.leads           force row level security;
alter table public.gallery_items   force row level security;

-- ---------------------------------------------------------------------
-- 2. Reset de permisos: partir de cero
-- ---------------------------------------------------------------------
revoke all on public.admins, public.menu_categories, public.menu_items,
              public.events_weekly, public.leads, public.gallery_items
  from anon, authenticated;

-- Contenido público: lectura para todos
grant select on public.menu_categories, public.menu_items, public.events_weekly, public.gallery_items
  to anon, authenticated;

-- Escritura del contenido: solo usuarios logueados.
-- Las políticas de abajo afinan esto a "logueado Y en la tabla admins".
grant insert, update, delete
  on public.menu_categories, public.menu_items, public.events_weekly, public.gallery_items
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

-- Galería
create policy "galeria_lectura_publica"
  on public.gallery_items for select to anon, authenticated
  using (activo = true);

create policy "galeria_escritura_admin"
  on public.gallery_items for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. Políticas: leads (suscriptores) — asimétrico a propósito
-- ---------------------------------------------------------------------

-- INSERT público: el formulario de captura debe funcionar sin sesión.
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
-- POR COMPLETO todo lo que hay en esta parte. Quien la tenga puede
-- leer todos los correos, borrar el menú entero y crear administradores.
-- Es equivalente a la contraseña de la base de datos.
--
-- NUNCA debe aparecer en js/supabase-config.js, en admin.html, ni en
-- ningún archivo del repositorio o servido al navegador.
--
-- En Supabase Dashboard > Settings > API se muestran ambas claves.
-- Copia SOLO la que dice `anon` / `public` / `publishable`.
-- =====================================================================


-- #######################################################################
-- # PARTE 3 — STORAGE (antes: 03-storage.sql)
-- #
-- # Nota sobre las fotos existentes: las de img/platos/ e img/ambiente/
-- # se quedan como archivos locales del sitio. Siguen funcionando sin
-- # conexión, que es un requisito duro del proyecto. Este bucket es para
-- # las fotos y videos NUEVOS que suba el dueño desde el panel.
-- #######################################################################

-- ---------------------------------------------------------------------
-- 1. Crear el bucket público
-- ---------------------------------------------------------------------
-- `public = true` significa que los archivos son legibles por URL directa
-- (necesario: las etiquetas <img>/<video> del sitio no envían cabeceras
-- de auth). La ESCRITURA sigue protegida por las políticas de abajo.
--
-- Límite de 50 MB por archivo: cubre fotos sin problema y videos cortos
-- tipo smartphone (formato vertical u horizontal, ~30-60s a compresión
-- de redes sociales). El plan gratuito de Supabase da 1 GB de
-- almacenamiento en total, así que conviene no subir decenas de videos
-- pesados.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  52428800,                                    -- 50 MB por archivo
  array[
    'image/jpeg','image/png','image/webp','image/avif',
    'video/mp4','video/quicktime','video/webm'  -- quicktime = .mov (iPhone)
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. Políticas sobre storage.objects
-- ---------------------------------------------------------------------
drop policy if exists "media_lectura_publica"  on storage.objects;
drop policy if exists "media_subida_admin"     on storage.objects;
drop policy if exists "media_update_admin"     on storage.objects;
drop policy if exists "media_borrado_admin"    on storage.objects;

-- Lectura: cualquiera puede ver las imágenes.
create policy "media_lectura_publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');

-- Subida: solo administradores.
create policy "media_subida_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

-- Reemplazar un archivo existente: solo administradores.
create policy "media_update_admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

-- Borrado: solo administradores.
create policy "media_borrado_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());


-- #######################################################################
-- # PARTE 4 — CARGA INICIAL (antes: 04-seed.sql)
-- #
-- # ⚠️ Los PRECIOS de los platos y los DÍAS/HORARIOS de los eventos son
-- # estimaciones, no datos confirmados por el negocio. Ver CLAUDE.md.
-- # El panel de administración existe precisamente para corregirlos.
-- #######################################################################

-- ---------------------------------------------------------------------
-- Categorías (fijas: el panel no permite crearlas ni borrarlas)
-- ---------------------------------------------------------------------
insert into public.menu_categories (id, label_es, label_en, orden) values
  ('desayunos', 'Desayunos', 'Breakfast',    10),
  ('entrantes', 'Entrantes', 'Starters',     20),
  ('mar',       'Del Mar',   'From the Sea', 30),
  ('italiano',  'Italiano',  'Italian',      40),
  ('postres',   'Postres',   'Desserts',     50),
  ('bebidas',   'Bebidas',   'Drinks',       60)
on conflict (id) do update
  set label_es = excluded.label_es,
      label_en = excluded.label_en,
      orden    = excluded.orden;

-- ---------------------------------------------------------------------
-- Platos (21)
-- `orden` en múltiplos de 10 para poder intercalar sin renumerar todo.
-- ---------------------------------------------------------------------
insert into public.menu_items
  (slug, category, nombre_es, nombre_en, desc_es, desc_en, precio, img, tags, orden)
values
  ('tostada-aguacate', 'desayunos',
   'Tostada de aguacate', 'Avocado toast',
   'Pan artesanal, aguacate fresco, tomate cherry y un toque de lima.',
   'Artisan bread, fresh avocado, cherry tomato and a touch of lime.',
   12, 'img/platos/desayuno.jpg', array['vegano'], 10),

  ('smoothie-bowl', 'desayunos',
   'Smoothie bowl tropical', 'Tropical smoothie bowl',
   'Frutas de temporada, granola casera y miel de abeja local.',
   'Seasonal fruit, house-made granola and local honey.',
   11, 'img/platos/frutas-frescas.jpg', array['vegano'], 20),

  ('panqueques', 'desayunos',
   'Panqueques de la casa', 'House pancakes',
   'Con sirope de maple, frutos rojos y mantequilla batida.',
   'With maple syrup, berries and whipped butter.',
   10, 'img/platos/desayuno.jpg', '{}', 30),

  ('coctel-camarones', 'entrantes',
   'Cóctel de camarones', 'Shrimp cocktail',
   'Camarones frescos del Caribe en salsa cóctel de la casa.',
   'Fresh Caribbean shrimp in house cocktail sauce.',
   16, 'img/platos/coctel-camarones.jpg', array['estrella'], 10),

  ('calamares', 'entrantes',
   'Calamares fritos', 'Fried calamari',
   'Ligeramente empanizados y fritos al punto, con alioli.',
   'Lightly battered and fried to perfection, served with aioli.',
   14, 'img/platos/plato-brocoli.jpg', '{}', 20),

  ('sopa-mariscos', 'entrantes',
   'Sopa de mariscos', 'Seafood soup',
   'Caldo de pescado y mariscos con vegetales frescos.',
   'Fish and shellfish broth with fresh vegetables.',
   13, 'img/platos/sopa.jpg', '{}', 30),

  ('bowl-vegano', 'entrantes',
   'Bowl vegano', 'Vegan bowl',
   'Generosa porción de vegetales de temporada, granos y aderezo cítrico.',
   'A generous portion of seasonal vegetables, grains and citrus dressing.',
   14, 'img/platos/frutas-frescas.jpg', array['vegano','estrella'], 40),

  ('dorado-maracuya', 'mar',
   'Dorado con salsa de maracuyá', 'Mahi-mahi with passion fruit sauce',
   'Dorado fresco a la plancha bañado en salsa de maracuyá de la casa.',
   'Fresh grilled mahi-mahi with house passion fruit sauce.',
   24, 'img/platos/steak.jpg', array['estrella'], 10),

  ('pescado-frito', 'mar',
   'Pescado frito entero', 'Whole fried fish',
   'Favorito local: sabor delicado y textura crujiente.',
   'A local favorite: delicate flavor and crispy texture.',
   22, 'img/platos/coctel-camarones.jpg', array['estrella'], 20),

  ('gratinado-mariscos', 'mar',
   'Gratinado de mariscos', 'Seafood gratin',
   'Mariscos frescos gratinados con queso y hierbas.',
   'Fresh shellfish gratin with cheese and herbs.',
   26, 'img/platos/sopa.jpg', '{}', 30),

  ('langostinos-ajillo', 'mar',
   'Langostinos al ajillo', 'Garlic butter prawns',
   'Langostinos salteados en mantequilla, ajo y perejil fresco.',
   'Prawns sautéed in butter, garlic and fresh parsley.',
   23, 'img/platos/steak.jpg', '{}', 40),

  ('pasta-mariscos', 'italiano',
   'Pasta ai frutti di mare', 'Seafood pasta',
   'Pasta artesanal con mariscos del día en salsa de tomate.',
   'House-made pasta with the day''s shellfish in tomato sauce.',
   20, 'img/platos/pasta-italiana.jpg', '{}', 10),

  ('pizza-lena', 'italiano',
   'Pizza al horno de leña', 'Wood-fired pizza',
   'Masa madre fermentada 48 horas, horneada al horno de leña.',
   '48-hour fermented sourdough, baked in our wood-fired oven.',
   17, 'img/platos/plato-brocoli.jpg', '{}', 20),

  ('hamburguesa-enjoy', 'italiano',
   'Hamburguesa Enjoy', 'Enjoy burger',
   'Carne premium, queso fundido y papas de la casa.',
   'Premium beef, melted cheese and house-cut fries.',
   15, 'img/ambiente/ambiente-mesa.jpg', '{}', 30),

  ('cheesecake', 'postres',
   'Cheesecake de la casa', 'House cheesecake',
   'Cremoso, con coulis de frutos rojos.',
   'Creamy, with a berry coulis.',
   9, 'img/platos/cheesecake.jpg', array['estrella'], 10),

  ('gelato', 'postres',
   'Gelato artesanal', 'Artisan gelato',
   'Sabores rotativos, hecho en casa a diario.',
   'Rotating flavors, made fresh daily in-house.',
   7, 'img/platos/postre-chocolate.jpg', array['vegano'], 20),

  ('pastel-chocolate', 'postres',
   'Pastel de chocolate', 'Chocolate cake',
   'Bizcocho húmedo de chocolate con ganache.',
   'Moist chocolate sponge with ganache.',
   9, 'img/platos/pastel.jpg', '{}', 30),

  ('cafe-borbone', 'bebidas',
   'Café Borbone', 'Borbone coffee',
   'Café italiano de especialidad, tostado en Borbone.',
   'Specialty Italian coffee, roasted by Borbone.',
   4, 'img/platos/cafe-borbone.jpg', '{}', 10),

  ('sangria', 'bebidas',
   'Sangría de la casa', 'House sangria',
   'Vino tinto, frutas frescas y un toque de brandy.',
   'Red wine, fresh fruit and a splash of brandy.',
   8, 'img/platos/sangria.jpg', '{}', 20),

  ('mamajuana', 'bebidas',
   'Mamajuana', 'Mamajuana',
   'El clásico trago dominicano de raíces y ron macerado.',
   'The classic Dominican root-and-rum infused drink.',
   9, 'img/platos/mamajuana.jpg', array['estrella'], 30),

  ('coctel-tropical', 'bebidas',
   'Cóctel tropical de la casa', 'House tropical cocktail',
   'Ron dominicano, maracuyá y menta fresca.',
   'Dominican rum, passion fruit and fresh mint.',
   10, 'img/platos/coctel-verde.jpg', '{}', 40)

on conflict (slug) do update
  set category  = excluded.category,
      nombre_es = excluded.nombre_es,
      nombre_en = excluded.nombre_en,
      desc_es   = excluded.desc_es,
      desc_en   = excluded.desc_en,
      precio    = excluded.precio,
      img       = excluded.img,
      tags      = excluded.tags,
      orden     = excluded.orden;

-- ---------------------------------------------------------------------
-- Eventos semanales (7 — uno por día, tal como están hoy)
--
-- El esquema permite añadir más de uno por día o dejar días vacíos.
-- Esto es solo el punto de partida.
--
-- dia: 0=domingo, 1=lunes ... 6=sábado (índice de Date.getDay())
-- ---------------------------------------------------------------------
insert into public.events_weekly
  (slug, dia, nombre_es, nombre_en, desc_es, desc_en, hora_inicio, hora_fin, img, orden)
values
  ('dom-musica-vivo', 0,
   'Música en vivo', 'Live music',
   'Set acústico junto al jardín para cerrar el fin de semana.',
   'Acoustic set by the garden to close out the weekend.',
   '19:00', '22:00', 'img/ambiente/musica-vivo.jpg', 10),

  ('lun-jazz', 1,
   'Noche de Jazz', 'Jazz Night',
   'Saxofonista en vivo entre platos de la cocina italiana.',
   'Live saxophone alongside our Italian kitchen favorites.',
   '19:00', '22:00', 'img/ambiente/saxofonista.jpg', 10),

  ('mar-dj', 2,
   'DJ Set', 'DJ Set',
   'Ritmos tropicales y cócteles de autor en la terraza.',
   'Tropical rhythms and signature cocktails on the terrace.',
   '20:00', '23:00', 'img/ambiente/dj-noche.jpg', 10),

  ('mie-musica-vivo', 3,
   'Música en vivo', 'Live music',
   'Set acústico junto al jardín, ideal para cenar en pareja.',
   'Acoustic set by the garden, perfect for a dinner for two.',
   '19:00', '22:00', 'img/ambiente/musica-vivo.jpg', 10),

  ('jue-jazz', 4,
   'Noche de Jazz', 'Jazz Night',
   'Saxofonista en vivo entre platos de la cocina italiana.',
   'Live saxophone alongside our Italian kitchen favorites.',
   '19:00', '22:00', 'img/ambiente/saxofonista.jpg', 10),

  ('vie-dj', 5,
   'DJ Set', 'DJ Set',
   'Arranca el fin de semana con ritmos tropicales y coctelería.',
   'Kick off the weekend with tropical rhythms and cocktails.',
   '20:00', '23:00', 'img/ambiente/dj-noche.jpg', 10),

  ('sab-especial', 6,
   'Noche Especial: Música en vivo + DJ', 'Special Night: Live Music + DJ',
   'La noche más animada de la semana: banda en vivo seguida de DJ hasta cerrar.',
   'The liveliest night of the week: live band followed by a DJ until close.',
   '19:00', '23:00', 'img/ambiente/bar-noche.jpg', 10)

on conflict (slug) do update
  set dia         = excluded.dia,
      nombre_es   = excluded.nombre_es,
      nombre_en   = excluded.nombre_en,
      desc_es     = excluded.desc_es,
      desc_en     = excluded.desc_en,
      hora_inicio = excluded.hora_inicio,
      hora_fin    = excluded.hora_fin,
      img         = excluded.img,
      orden       = excluded.orden;

-- ---------------------------------------------------------------------
-- Galería (18 fotos — las mismas que ya estaban hardcodeadas en
-- galeria.html). Todas quedan como `tipo = 'imagen'`; los videos se
-- añaden después desde el panel, no hay ninguno de partida.
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


-- #######################################################################
-- # COMPROBACIÓN
-- #######################################################################
-- Ejecuta esto después para confirmar que todo se creó bien:
--
--   select tablename, rowsecurity from pg_tables
--    where schemaname = 'public' order by tablename;        -- las 6, rowsecurity = true
--   select count(*) from public.menu_items;                 -- 21
--   select count(*) from public.events_weekly;               -- 7
--   select count(*) from public.gallery_items;                -- 18
--   select file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'media';                -- 52428800, incluye video/*
--
-- Después de esto, sigue con los pasos manuales de sql/README.md:
-- desactivar registro público, crear tu usuario admin, e insertarlo
-- en la tabla `admins`.
