// =====================================================================
// Configuración de Supabase
//
// CÓMO RELLENARLO:
//   Supabase Dashboard > Settings > API
//     - "Project URL"                              -> url
//     - Clave publicable (`sb_publishable_...`)    -> anonKey
//       (en proyectos antiguos se llama "anon / public" y empieza por eyJ...)
//
// ⚠️  NUNCA pongas aquí la clave secreta (`sb_secret_...` o `service_role`).
//     Esa clave IGNORA todas las políticas de seguridad de la base:
//     quien la tenga puede leer todos los correos de los suscriptores,
//     borrar el menú entero y crear administradores. Este archivo lo
//     descarga cualquier visitante del sitio.
//
//     Cómo distinguirlas:  sb_publishable_... = pública, va aquí. ✅
//                          sb_secret_...      = secreta, NUNCA. ❌
//
// La clave publicable SÍ va aquí: es un identificador público del
// proyecto, no un secreto. Por sí sola no da acceso a nada — todo lo
// controlan las políticas RLS definidas en sql/02-rls.sql.
//
// MIENTRAS FALTE LA URL: el sitio funciona con normalidad usando los
// datos locales de js/menu-data.js y js/events-data.js. El panel de
// administración mostrará un aviso de que falta configurarlo.
// =====================================================================

const SUPABASE_CONFIG = {
  // URL de la API REST. OJO: no es el host de la base de datos
  // (db.xxx.supabase.co, puerto 5432) — ese es solo para conexiones
  // Postgres directas y no responde por HTTP.
  url: "https://buxkahmxaubgygsbreze.supabase.co",

  // Clave publicable — segura para el frontend.
  anonKey: "sb_publishable_Ye6rfsrZxf9q7xLqwuP-CA_PQfBwSeS",
};

// true cuando ambos valores están rellenos
const SUPABASE_READY = Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
