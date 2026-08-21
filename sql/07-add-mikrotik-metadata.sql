-- =====================================================================
-- Enjoy PC Restaurante — Migración: metadata del portal MikroTik en `leads`
--
-- Añade dos columnas opcionales que ahora envía mikrotik/login.html:
--   - mac:       dirección MAC del dispositivo que se conectó al WiFi
--                (viene de $(mac-esc), sin el prefijo "T-" que solo es
--                la convención de RouterOS para el username de Trial).
--   - timestamp: hora del NAVEGADOR al enviar el formulario. Es distinta
--                de `created_at` (que ya existe y registra la hora del
--                SERVIDOR de Supabase) — se guardan ambas a propósito,
--                por si alguna vez interesa comparar reloj del visitante
--                contra reloj del servidor.
--
-- Ejecutar UNA vez en un proyecto que YA tiene 01-06 aplicados (si estás
-- montando el proyecto desde cero, no hace falta este archivo:
-- 01-schema.sql ya incluye estas columnas desde el principio).
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query.
-- =====================================================================

alter table public.leads
  add column if not exists mac text;

alter table public.leads
  add column if not exists "timestamp" timestamptz;

-- ---------------------------------------------------------------------
-- Comprobación
-- ---------------------------------------------------------------------
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'leads';
-- Debe listar: id, nombre, email, telefono, idioma, origen, created_at, mac, timestamp
