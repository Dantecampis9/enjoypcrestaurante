// =====================================================================
// Capa de datos de las páginas públicas.
//
// Habla con la API REST de Supabase (PostgREST) usando fetch() nativo.
// NO carga el SDK de Supabase: eso son ~120 KB de terceros que romperían
// el requisito de que el sitio público funcione sin conexión.
//
// Estrategia: "render optimista con revalidación".
//   1. La página pinta de inmediato con los datos locales
//      (js/menu-data.js / js/events-data.js) — comportamiento idéntico
//      al de siempre, sin esperas ni pantallas en blanco.
//   2. En segundo plano se consulta Supabase.
//   3. Si responde, se re-renderiza con los datos frescos.
//   4. Si falla (sin red, proyecto pausado, RLS mal puesto), no pasa
//      nada: se queda lo local.
//
// Los archivos JS locales son el respaldo offline y deben mantenerse
// actualizados con el botón "Exportar respaldo JS" del panel.
// =====================================================================

const DataSource = (() => {
  const TIMEOUT_MS = 4000;

  function isConfigured() {
    return typeof SUPABASE_CONFIG !== "undefined" && Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
  }

  // Devuelve un array con los datos, o null si no se pudo obtener.
  // Nunca lanza: un fallo de red no debe romper la página.
  async function fetchTable(path) {
    if (!isConfigured()) return null;
    if (navigator.onLine === false) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_CONFIG.anonKey,
          Authorization: "Bearer " + SUPABASE_CONFIG.anonKey,
        },
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // --- Normalizadores: fila plana de Postgres -> forma anidada {es, en}
  // Así el código de render de menu.html / eventos.html y el sistema i18n
  // siguen funcionando exactamente igual.

  function toCategory(row) {
    return {
      id: row.id,
      label: { es: row.label_es, en: row.label_en },
    };
  }

  function toMenuItem(row) {
    return {
      id: row.id,
      category: row.category,
      nombre: { es: row.nombre_es, en: row.nombre_en },
      desc: { es: row.desc_es, en: row.desc_en },
      // Postgres numeric llega como string ("12.00"); Number() lo deja en 12
      precio: Number(row.precio),
      img: row.img,
      tags: Array.isArray(row.tags) ? row.tags : [],
    };
  }

  function toEvent(row) {
    return {
      id: row.id,
      day: row.dia,
      nombre: { es: row.nombre_es, en: row.nombre_en },
      desc: { es: row.desc_es, en: row.desc_en },
      // Postgres time llega como "19:00:00"; recortar a "19:00" para que
      // sea idéntico al formato de los archivos locales
      horaInicio: String(row.hora_inicio).slice(0, 5),
      horaFin: String(row.hora_fin).slice(0, 5),
      img: row.img,
    };
  }

  // --- API pública

  // Devuelve {categories, items} o null si no hay datos remotos usables.
  async function loadMenu() {
    const [cats, items] = await Promise.all([
      fetchTable("menu_categories?activo=eq.true&order=orden.asc"),
      fetchTable("menu_items?activo=eq.true&order=category.asc,orden.asc"),
    ]);

    // Un array vacío se descarta a propósito: una base recién creada o un
    // RLS mal aplicado no debe dejar la carta en blanco.
    if (!cats || !items || cats.length === 0 || items.length === 0) return null;

    return {
      categories: cats.map(toCategory),
      items: items.map(toMenuItem),
    };
  }

  // Devuelve un array de eventos o null.
  // Aquí SÍ se acepta el array vacío como respuesta válida: que no haya
  // ningún evento programado es un estado legítimo del negocio.
  async function loadEvents() {
    const rows = await fetchTable("events_weekly?activo=eq.true&order=dia.asc,orden.asc,hora_inicio.asc");
    if (!rows) return null;
    return rows.map(toEvent);
  }

  function toGalleryItem(row) {
    return {
      id: row.id,
      tipo: row.tipo === "video" ? "video" : "imagen",
      archivo: row.archivo,
      alt: { es: row.alt_es, en: row.alt_en },
    };
  }

  // Devuelve un array de items de galería o null.
  // Igual que el menú: un array vacío se descarta, nunca dejamos la
  // galería en blanco por una base recién creada o un RLS mal aplicado.
  async function loadGallery() {
    const rows = await fetchTable("gallery_items?activo=eq.true&order=orden.asc");
    if (!rows || rows.length === 0) return null;
    return rows.map(toGalleryItem);
  }

  return { isConfigured, loadMenu, loadEvents, loadGallery };
})();

// Escapa texto antes de interpolarlo en innerHTML.
// Necesario ahora que los textos son editables desde el panel: ya no son
// constantes escritas por nosotros en las que se pueda confiar.
function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
