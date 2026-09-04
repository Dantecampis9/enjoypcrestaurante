// =====================================================================
// Rescate de contactos del portal WiFi (MikroTik Hotspot)
//
// EL PROBLEMA QUE RESUELVE
// -----------------------------------------------------------------
// El portal cautivo (mikrotik/login.html) pide nombre, correo y teléfono
// ANTES de conceder la red. En ese instante el dispositivo todavía no
// tiene internet, así que su fetch() a Supabase solo completa si el
// router tiene el dominio en el Walled Garden IP. Y ni con eso está
// garantizado: Supabase está detrás de Cloudflare y sus IPs pueden rotar
// sin aviso, dejando de coincidir con la regla del router.
//
// Cuando ese guardado no se confirma, el portal adjunta los datos al
// FRAGMENTO de la URL a la que MikroTik redirige tras autenticar:
//
//   https://dantecampis9.github.io/enjoypcrestaurante/#lead=eyJub21...
//
// El fragmento (todo lo que va tras "#") es la única parte de una URL
// que el navegador NO envía a ningún servidor: nunca llega a GitHub
// Pages ni queda en ningún log. Se queda en el dispositivo hasta que
// este archivo lo lee, hace el INSERT — ya con internet completo, sin
// depender del router — y limpia la barra de direcciones.
//
// POR QUÉ NO SE DUPLICAN LOS CONTACTOS
// -----------------------------------------------------------------
// El portal solo añade el fragmento cuando Supabase NO le confirmó el
// guardado (respuesta distinta de 2xx, error de red o timeout). O guarda
// el portal, o guarda esta página: nunca las dos.
//
// SOBRE LOS DATOS QUE LLEGAN AQUÍ
// -----------------------------------------------------------------
// Vienen de una URL, así que son entrada no confiable: se recortan a la
// longitud de cada columna y se normalizan antes de insertar. No se
// pintan nunca en el DOM. La tabla `leads` ya acepta INSERT anónimo por
// diseño (ver sql/02-rls.sql), así que esto no abre nada nuevo.
// =====================================================================

(function () {
  const PREFIJO = "lead=";

  // Debe coincidir con las columnas reales de `leads`:
  // id, nombre, email, telefono, idioma, origen, created_at.
  // Mandar una columna inexistente hace que PostgREST rechace el INSERT
  // entero con un 400 — y fetch() no lanza excepción ante un error HTTP,
  // así que el fallo pasaría desapercibido.
  const LIMITES = { nombre: 120, email: 255, telefono: 20 };

  function decodificar(payload) {
    // base64url -> base64 -> texto UTF-8 -> objeto
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }

  function limpiarUrl() {
    // Fuera de la barra de direcciones y del historial cuanto antes.
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (err) {
      location.hash = "";
    }
  }

  function recortar(valor, maximo) {
    return String(valor == null ? "" : valor).trim().slice(0, maximo);
  }

  const hash = location.hash.replace(/^#/, "");
  if (hash.indexOf(PREFIJO) !== 0) return;

  const payload = hash.slice(PREFIJO.length);
  limpiarUrl();

  if (typeof SUPABASE_READY === "undefined" || !SUPABASE_READY || !window.fetch) return;

  let datos;
  try {
    datos = decodificar(payload);
  } catch (err) {
    // Fragmento corrupto o manipulado: no hay nada que rescatar.
    return;
  }

  const nombre = recortar(datos && datos.nombre, LIMITES.nombre);
  const email = recortar(datos && datos.email, LIMITES.email);
  if (!nombre || !email) return;

  fetch(SUPABASE_CONFIG.url + "/rest/v1/leads", {
    method: "POST",
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: "Bearer " + SUPABASE_CONFIG.anonKey,
      "Content-Type": "application/json",
      // Sin esta cabecera PostgREST hace INSERT ... RETURNING *, y ese
      // RETURNING activa las políticas de SELECT de `leads`, que un
      // visitante anónimo no tiene. El INSERT fallaría. Ver sql/02-rls.sql.
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      nombre: nombre,
      email: email,
      telefono: recortar(datos.telefono, LIMITES.telefono),
      idioma: datos.idioma === "en" ? "en" : "es",
      origen: "mikrotik-hotspot",
    }),
  })
    .then(function (res) {
      if (!res.ok) console.warn("[lead-capture] Supabase rechazó el contacto:", res.status);
    })
    .catch(function () {
      // Sin conexión o proyecto pausado. Es un rescate silencioso: el
      // visitante no debe enterarse de nada, ni para bien ni para mal.
    });
})();
