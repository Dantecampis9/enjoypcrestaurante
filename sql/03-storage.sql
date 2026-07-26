-- =====================================================================
-- Enjoy PC Restaurante — Supabase Storage (fotos de platos y eventos)
--
-- Ejecutar DESPUÉS de 02-rls.sql.
--
-- Nota sobre las fotos existentes: las de img/platos/ e img/ambiente/ se
-- quedan como archivos locales del sitio. Siguen funcionando sin
-- conexión, que es un requisito duro del proyecto. Este bucket es para
-- las fotos NUEVAS que suba el dueño desde el panel.
--
-- El campo `img` de menu_items / events_weekly acepta ambas formas:
--   - ruta local:  "img/platos/steak.jpg"
--   - URL Storage: "https://<proyecto>.supabase.co/storage/v1/object/public/media/platos/xxx.jpg"
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Crear el bucket público
-- ---------------------------------------------------------------------
-- `public = true` significa que los archivos son legibles por URL directa
-- (necesario: las etiquetas <img> del sitio no envían cabeceras de auth).
-- La ESCRITURA sigue protegida por las políticas de abajo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,                                     -- 5 MB por archivo
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. Políticas sobre storage.objects
-- ---------------------------------------------------------------------
-- Limpieza por si se re-ejecuta el script
drop policy if exists "media_lectura_publica"  on storage.objects;
drop policy if exists "media_subida_admin"     on storage.objects;
drop policy if exists "media_update_admin"     on storage.objects;
drop policy if exists "media_borrado_admin"    on storage.objects;

-- Lectura: cualquiera puede ver las imágenes.
-- (Redundante con public=true para el acceso por URL, pero necesaria para
-- listar el bucket desde el panel y explícita es mejor que implícita.)
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

-- ---------------------------------------------------------------------
-- 3. Prueba negativa recomendada
-- ---------------------------------------------------------------------
-- Desde una ventana de incógnito, sin sesión, intentar subir un archivo
-- al bucket usando solo la anon key debe devolver 403.
-- Si devuelve 200, las políticas no se aplicaron: revisa este script.
