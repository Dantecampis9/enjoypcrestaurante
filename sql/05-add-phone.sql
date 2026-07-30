-- =====================================================================
-- Enjoy PC Restaurante — Migración: añadir teléfono a `leads`
--
-- Ejecutar UNA vez en un proyecto que YA tiene 01-04 aplicados (si estás
-- montando el proyecto desde cero, no hace falta este archivo: 01-schema.sql
-- y 02-rls.sql ya incluyen el teléfono desde el principio).
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =====================================================================

-- La columna se añade SIN "not null": si ya tienes suscriptores
-- guardados (desde el modal antiguo o el portal MikroTik), no tienen
-- teléfono y una restricción not null rompería la migración. Los
-- registros nuevos siempre traerán teléfono porque el formulario del
-- portal lo exige y la política de abajo lo valida.
alter table public.leads
  add column if not exists telefono text;

-- Formato: solo dígitos, espacios, +, -, ( ) — entre 7 y 20 caracteres.
-- "telefono is null" se permite a propósito, por la misma razón de arriba.
alter table public.leads
  drop constraint if exists leads_telefono_format;

alter table public.leads
  add constraint leads_telefono_format check (
    telefono is null or (
      char_length(telefono) between 7 and 20
      and telefono ~ '^[0-9+()\s-]+$'
    )
  );

-- Reemplaza la política de INSERT público para exigir teléfono también
-- en los registros NUEVOS (los que entren desde ahora en adelante).
drop policy if exists "leads_insert_publico" on public.leads;

create policy "leads_insert_publico"
  on public.leads for insert to anon, authenticated
  with check (
    char_length(nombre) between 1 and 120
    and char_length(email) <= 255
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and char_length(telefono) between 7 and 20
    and telefono ~ '^[0-9+()\s-]+$'
  );

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'leads';
-- Debe listar: id, nombre, email, telefono, idioma, origen, created_at
