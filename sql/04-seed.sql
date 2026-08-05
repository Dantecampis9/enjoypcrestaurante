-- =====================================================================
-- Enjoy PC Restaurante — Carga inicial
--
-- Ejecutar DESPUÉS de 03-storage.sql.
--
-- Transcribe 1:1 el contenido actual de js/menu-data.js y
-- js/events-data.js. Es idempotente: se puede volver a ejecutar sin
-- duplicar filas (usa `on conflict (slug)`).
--
-- ⚠️ Los PRECIOS de los platos y los DÍAS/HORARIOS de los eventos son
-- estimaciones, no datos confirmados por el negocio. Ver CLAUDE.md.
-- El panel de administración existe precisamente para corregirlos.
-- =====================================================================

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
-- A diferencia del archivo JS original, el esquema permite añadir más de
-- uno por día o dejar días vacíos. Esto es solo el punto de partida.
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

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
-- select count(*) from public.menu_items;     -- debe dar 21
-- select count(*) from public.events_weekly;  -- debe dar 7
-- select count(*) from public.gallery_items;  -- debe dar 18
