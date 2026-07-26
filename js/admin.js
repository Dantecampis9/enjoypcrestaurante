// =====================================================================
// Panel de administración — lógica
//
// SOBRE LA SEGURIDAD: el ocultar/mostrar vistas que hace este archivo NO
// es la protección. Cualquiera puede saltárselo con DevTools. La
// protección real son las políticas RLS de sql/02-rls.sql: sin una sesión
// válida de un usuario que esté en la tabla `admins`, Postgres rechaza
// toda lectura de suscriptores y toda escritura. El panel sin sesión es
// una cáscara vacía.
// =====================================================================

(function () {
  "use strict";

  const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const TAGS_DISPONIBLES = [
    { id: "vegano", label: "Vegano" },
    { id: "estrella", label: "Recomendado" },
  ];
  const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5 MB, igual que el límite del bucket

  let sb = null;              // cliente de Supabase
  let categorias = [];
  let platos = [];
  let eventos = [];
  let leads = [];

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  let toastTimer = null;
  function toast(msg, tipo) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 font-body-md shadow-lg " +
      (tipo === "error" ? "bg-error text-on-error" : "bg-primary text-on-primary");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hide(el), 3500);
  }

  function hhmm(t) { return String(t || "").slice(0, 5); }

  function formatPrecio(n) {
    const num = Number(n);
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
  }

  function formatFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-DO", { year: "numeric", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  }

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------
  function init() {
    if (typeof SUPABASE_CONFIG === "undefined" || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      show($("setup-warning"));
      return;
    }
    if (typeof supabase === "undefined") {
      show($("setup-warning"));
      $("setup-warning").querySelector("h1").textContent = "No se pudo cargar Supabase";
      return;
    }

    sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

    wireLogin();
    wireTabs();
    wireEditor();
    wireActions();

    // El login es el estado por defecto: se muestra YA. Si luego resulta
    // que hay sesión válida, se cambia al panel.
    //
    // Es importante hacerlo en este orden. Si esperásemos a getSession()
    // para decidir qué mostrar, un fallo de red (sin internet, proyecto
    // pausado, DNS caído) dejaría la página en blanco sin explicación,
    // porque la promesa nunca resolvería.
    show($("login-view"));

    let resuelto = false;
    const marcar = () => { resuelto = true; };

    sb.auth.getSession()
      .then(({ data, error }) => {
        marcar();
        if (error) { avisoConexion(); return; }
        if (data && data.session) onSignedIn(data.session);
      })
      .catch(() => {
        marcar();
        avisoConexion();
      });

    // Red de seguridad: si getSession() nunca contesta (ni resuelve ni
    // falla), el formulario ya está visible y avisamos del problema.
    setTimeout(() => {
      if (!resuelto) avisoConexion();
    }, 8000);
  }

  // Aviso no bloqueante en la pantalla de login cuando no se puede
  // contactar con Supabase. El formulario sigue visible y utilizable.
  function avisoConexion() {
    const err = $("login-error");
    if (!err || !$("panel-view").classList.contains("hidden")) return;
    err.textContent = "No se pudo conectar con Supabase. Revisa tu conexión, " +
      "que la URL de js/supabase-config.js sea correcta y que el proyecto no esté pausado.";
    show(err);
  }

  // ------------------------------------------------------------------
  // Autenticación
  // ------------------------------------------------------------------
  function wireLogin() {
    $("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("login-submit");
      const err = $("login-error");
      hide(err);
      btn.disabled = true;
      btn.textContent = "Entrando…";

      const { data, error } = await sb.auth.signInWithPassword({
        email: $("login-email").value.trim(),
        password: $("login-password").value,
      });

      btn.disabled = false;
      btn.textContent = "Entrar";

      if (error) {
        err.textContent = "Correo o contraseña incorrectos.";
        show(err);
        return;
      }
      onSignedIn(data.session);
    });

    $("logout-btn").addEventListener("click", async () => {
      await sb.auth.signOut();
      location.reload();
    });
  }

  async function onSignedIn(session) {
    // Estar autenticado no basta: hay que estar en la tabla `admins`.
    // Esta consulta la filtra RLS, así que devuelve fila solo si procede.
    const { data: adminRow, error } = await sb
      .from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();

    const err = $("login-error");

    // Distinguir "no puedo preguntar" de "la respuesta es no": cerrar la
    // sesión por un fallo de red sería confuso y haría perder el trabajo.
    if (error) {
      show($("login-view"));
      err.textContent = error.message && /relation|does not exist|schema cache/i.test(error.message)
        ? "Las tablas no existen todavía. Ejecuta los scripts de la carpeta sql/ (ver sql/README.md)."
        : "No se pudo verificar la cuenta: " + error.message;
      show(err);
      return;
    }

    if (!adminRow) {
      await sb.auth.signOut();
      show($("login-view"));
      err.textContent = "Esta cuenta no tiene permisos de administrador. " +
        "Falta añadirla a la tabla `admins` (paso 4 de sql/README.md).";
      show(err);
      return;
    }

    hide($("login-view"));
    hide(err);
    show($("panel-view"));
    $("admin-email").textContent = session.user.email;

    await Promise.all([cargarMenu(), cargarEventos(), cargarLeads()]);
    activarTab("menu");
    mostrarUltimaExportacion();
  }

  // ------------------------------------------------------------------
  // Pestañas
  // ------------------------------------------------------------------
  function wireTabs() {
    document.querySelectorAll(".admin-tab").forEach((btn) => {
      btn.addEventListener("click", () => activarTab(btn.dataset.tab));
    });
  }

  function activarTab(nombre) {
    document.querySelectorAll(".admin-tab").forEach((b) => {
      const activo = b.dataset.tab === nombre;
      b.setAttribute("aria-selected", String(activo));
      b.className = "admin-tab px-5 py-3 font-label-caps text-label-caps whitespace-nowrap transition-colors " +
        (activo ? "text-primary border-b-2 border-primary" : "text-secondary hover:text-primary");
    });
    document.querySelectorAll(".admin-panel").forEach((p) => hide(p));
    show($("tab-" + nombre));
  }

  // ------------------------------------------------------------------
  // Datos: cargar
  // ------------------------------------------------------------------
  async function cargarMenu() {
    const [cats, items] = await Promise.all([
      sb.from("menu_categories").select("*").order("orden"),
      sb.from("menu_items").select("*").order("category").order("orden"),
    ]);
    if (cats.error || items.error) { toast("No se pudo cargar el menú", "error"); return; }
    categorias = cats.data || [];
    platos = items.data || [];
    renderMenu();
  }

  async function cargarEventos() {
    const { data, error } = await sb.from("events_weekly").select("*")
      .order("dia").order("orden").order("hora_inicio");
    if (error) { toast("No se pudieron cargar los eventos", "error"); return; }
    eventos = data || [];
    renderEventos();
  }

  async function cargarLeads() {
    const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false });
    if (error) { toast("No se pudieron cargar los suscriptores", "error"); return; }
    leads = data || [];
    renderLeads();
  }

  // ------------------------------------------------------------------
  // Render: menú
  // ------------------------------------------------------------------
  function renderMenu() {
    const cont = $("menu-list");
    if (!categorias.length) { cont.innerHTML = "<p class='font-body-md text-on-surface-variant'>No hay categorías. ¿Ejecutaste sql/04-seed.sql?</p>"; return; }

    cont.innerHTML = categorias.map((cat) => {
      const items = platos.filter((p) => p.category === cat.id);
      const filas = items.length
        ? items.map(filaPlato).join("")
        : "<p class='font-body-md text-on-surface-variant p-4'>Sin platos en esta categoría.</p>";
      return `
        <div>
          <h3 class="font-headline-sm text-headline-sm text-on-surface mb-3">
            ${esc(cat.label_es)}
            <span class="font-body-md text-on-surface-variant">(${items.length})</span>
          </h3>
          <div class="bg-surface shadow-sm divide-y divide-outline-variant">${filas}</div>
        </div>`;
    }).join("");

    cont.querySelectorAll("[data-edit-dish]").forEach((b) =>
      b.addEventListener("click", () => abrirEditorPlato(b.dataset.editDish)));
    cont.querySelectorAll("[data-del-dish]").forEach((b) =>
      b.addEventListener("click", () => borrarPlato(b.dataset.delDish)));
  }

  function filaPlato(p) {
    const tags = (p.tags || []).map((t) => {
      const def = TAGS_DISPONIBLES.find((x) => x.id === t);
      return `<span class="text-xs font-label-caps px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full">${esc(def ? def.label : t)}</span>`;
    }).join(" ");

    return `
      <div class="p-4 flex items-center gap-4 ${p.activo ? "" : "opacity-50"}">
        <div class="w-16 h-16 bg-cover bg-center bg-surface-container shrink-0" style="background-image:url('${esc(p.img)}')"></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="font-headline-sm text-on-surface">${esc(p.nombre_es)}</span>
            <span class="font-body-md text-primary">$${formatPrecio(p.precio)}</span>
            ${p.activo ? "" : "<span class='text-xs font-label-caps text-on-surface-variant'>(oculto)</span>"}
          </div>
          <p class="font-body-md text-on-surface-variant text-sm truncate">${esc(p.desc_es)}</p>
          <div class="flex gap-1 mt-1">${tags}</div>
        </div>
        <div class="flex gap-2 shrink-0">
          <button data-edit-dish="${esc(p.id)}" class="text-secondary hover:text-primary transition-colors" aria-label="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button data-del-dish="${esc(p.id)}" class="text-secondary hover:text-error transition-colors" aria-label="Borrar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------
  // Render: eventos (agrupados por día, mostrando los vacíos)
  // ------------------------------------------------------------------
  function renderEventos() {
    const cont = $("events-list");
    cont.innerHTML = DIAS.map((nombreDia, idx) => {
      const delDia = eventos.filter((e) => e.dia === idx);
      const cuerpo = delDia.length
        ? `<div class="bg-surface shadow-sm divide-y divide-outline-variant">${delDia.map(filaEvento).join("")}</div>`
        : `<div class="bg-surface shadow-sm p-4 flex items-center justify-between gap-4">
             <span class="font-body-md text-on-surface-variant">Sin eventos este día</span>
             <button data-new-event-day="${idx}" class="font-label-caps text-label-caps text-primary hover:underline">+ Añadir</button>
           </div>`;
      return `<div><h3 class="font-headline-sm text-headline-sm text-on-surface mb-2">${nombreDia}</h3>${cuerpo}</div>`;
    }).join("");

    cont.querySelectorAll("[data-edit-event]").forEach((b) =>
      b.addEventListener("click", () => abrirEditorEvento(b.dataset.editEvent)));
    cont.querySelectorAll("[data-del-event]").forEach((b) =>
      b.addEventListener("click", () => borrarEvento(b.dataset.delEvent)));
    cont.querySelectorAll("[data-new-event-day]").forEach((b) =>
      b.addEventListener("click", () => abrirEditorEvento(null, Number(b.dataset.newEventDay))));
  }

  function filaEvento(e) {
    // Aviso, no bloqueo: un evento de 22:00 a 01:00 es legítimo.
    const cruzaMedianoche = hhmm(e.hora_fin) <= hhmm(e.hora_inicio);
    return `
      <div class="p-4 flex items-center gap-4 ${e.activo ? "" : "opacity-50"}">
        <div class="w-16 h-16 bg-cover bg-center bg-surface-container shrink-0" style="background-image:url('${esc(e.img)}')"></div>
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="font-headline-sm text-on-surface">${esc(e.nombre_es)}</span>
            ${e.activo ? "" : "<span class='text-xs font-label-caps text-on-surface-variant'>(oculto)</span>"}
          </div>
          <p class="font-body-md text-on-surface-variant text-sm truncate">${esc(e.desc_es)}</p>
          <p class="font-label-caps text-label-caps text-secondary mt-1">
            ${esc(hhmm(e.hora_inicio))} – ${esc(hhmm(e.hora_fin))}
            ${cruzaMedianoche ? "<span class='text-on-surface-variant'>(cruza medianoche)</span>" : ""}
          </p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button data-edit-event="${esc(e.id)}" class="text-secondary hover:text-primary transition-colors" aria-label="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button data-del-event="${esc(e.id)}" class="text-secondary hover:text-error transition-colors" aria-label="Borrar">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------
  // Render: suscriptores
  // ------------------------------------------------------------------
  function renderLeads() {
    $("leads-count").textContent = leads.length === 1
      ? "1 suscriptor" : `${leads.length} suscriptores`;

    const cont = $("leads-list");
    if (!leads.length) {
      cont.innerHTML = "<p class='font-body-md text-on-surface-variant p-6'>Todavía no hay suscriptores.</p>";
      return;
    }
    cont.innerHTML = `
      <table class="w-full text-left">
        <thead class="border-b border-outline-variant">
          <tr>
            <th class="font-label-caps text-label-caps text-on-surface-variant p-4">Nombre</th>
            <th class="font-label-caps text-label-caps text-on-surface-variant p-4">Correo</th>
            <th class="font-label-caps text-label-caps text-on-surface-variant p-4 whitespace-nowrap">Fecha</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          ${leads.map((l) => `
            <tr>
              <td class="font-body-md p-4">${esc(l.nombre)}</td>
              <td class="font-body-md p-4"><a href="mailto:${esc(l.email)}" class="text-secondary hover:text-primary">${esc(l.email)}</a></td>
              <td class="font-body-md text-on-surface-variant p-4 whitespace-nowrap text-sm">${esc(formatFecha(l.created_at))}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
  }

  // ------------------------------------------------------------------
  // Editor (modal reutilizado para platos y eventos)
  // ------------------------------------------------------------------
  let editorSubmit = null;

  function wireEditor() {
    $("editor-close").addEventListener("click", cerrarEditor);
    $("editor-cancel").addEventListener("click", cerrarEditor);
    $("editor-modal").addEventListener("click", (e) => {
      if (e.target === $("editor-modal")) cerrarEditor();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("editor-modal").classList.contains("hidden")) cerrarEditor();
    });
    $("editor-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (editorSubmit) await editorSubmit();
    });
  }

  function abrirEditor(titulo, camposHtml, onSubmit) {
    $("editor-title").textContent = titulo;
    $("editor-fields").innerHTML = camposHtml;
    hide($("editor-error"));
    editorSubmit = onSubmit;
    show($("editor-modal"));
    document.body.style.overflow = "hidden";
    wireImagenPreview();
  }

  function cerrarEditor() {
    hide($("editor-modal"));
    document.body.style.overflow = "";
    editorSubmit = null;
  }

  function errorEditor(msg) {
    const el = $("editor-error");
    el.textContent = msg;
    show(el);
  }

  function campoTexto(id, label, valor, opts) {
    opts = opts || {};
    const tag = opts.textarea
      ? `<textarea id="${id}" rows="2" class="w-full border border-outline-variant px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary">${esc(valor)}</textarea>`
      : `<input id="${id}" type="${opts.type || "text"}" ${opts.attrs || ""} value="${esc(valor)}" class="w-full border border-outline-variant px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />`;
    return `<div><label for="${id}" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">${esc(label)}</label>${tag}</div>`;
  }

  function campoImagen(valorActual) {
    return `
      <div>
        <label class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Imagen</label>
        <div class="flex items-center gap-3 mb-2">
          <div id="img-preview" class="w-20 h-20 bg-cover bg-center bg-surface-container shrink-0" style="background-image:url('${esc(valorActual)}')"></div>
          <input id="f-img-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"
                 class="font-body-md text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-4 file:border-0 file:font-label-caps file:text-label-caps file:bg-primary file:text-on-primary" />
        </div>
        <input id="f-img" type="text" value="${esc(valorActual)}"
               class="w-full border border-outline-variant px-3 py-2 font-body-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        <p class="font-body-md text-on-surface-variant text-xs mt-1">
          Ruta local (img/platos/…) o URL. Al subir un archivo se rellena sola. Máx. 5 MB.
        </p>
      </div>`;
  }

  function wireImagenPreview() {
    const file = $("f-img-file");
    if (!file) return;
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (!f.type.startsWith("image/")) { errorEditor("El archivo debe ser una imagen."); return; }
      if (f.size > MAX_IMG_BYTES) { errorEditor("La imagen supera los 5 MB."); return; }

      hide($("editor-error"));
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const ruta = `subidas/${crypto.randomUUID()}.${ext}`;

      const { error } = await sb.storage.from("media").upload(ruta, f, {
        cacheControl: "31536000", upsert: false, contentType: f.type,
      });
      if (error) { errorEditor("No se pudo subir la imagen: " + error.message); return; }

      const { data } = sb.storage.from("media").getPublicUrl(ruta);
      $("f-img").value = data.publicUrl;
      $("img-preview").style.backgroundImage = `url('${data.publicUrl}')`;
      toast("Imagen subida");
    });
  }

  // ---------------------------- Platos ----------------------------
  function abrirEditorPlato(id) {
    const p = id ? platos.find((x) => x.id === id) : null;
    const nuevo = !p;

    const opciones = categorias.map((c) =>
      `<option value="${esc(c.id)}" ${p && p.category === c.id ? "selected" : ""}>${esc(c.label_es)}</option>`).join("");

    const checks = TAGS_DISPONIBLES.map((t) => `
      <label class="flex items-center gap-2 font-body-md">
        <input type="checkbox" id="f-tag-${t.id}" ${p && (p.tags || []).includes(t.id) ? "checked" : ""} />
        ${esc(t.label)}
      </label>`).join("");

    abrirEditor(nuevo ? "Nuevo plato" : "Editar plato", `
      ${campoTexto("f-nombre-es", "Nombre (español)", p ? p.nombre_es : "")}
      ${campoTexto("f-nombre-en", "Nombre (inglés)", p ? p.nombre_en : "")}
      ${campoTexto("f-desc-es", "Descripción (español)", p ? p.desc_es : "", { textarea: true })}
      ${campoTexto("f-desc-en", "Descripción (inglés)", p ? p.desc_en : "", { textarea: true })}
      <div class="grid grid-cols-2 gap-4">
        ${campoTexto("f-precio", "Precio (USD)", p ? formatPrecio(p.precio) : "0", { type: "number", attrs: 'step="0.01" min="0"' })}
        <div>
          <label for="f-categoria" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Categoría</label>
          <select id="f-categoria" class="w-full border border-outline-variant px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary">${opciones}</select>
        </div>
      </div>
      ${campoImagen(p ? p.img : "")}
      <div class="flex gap-6 flex-wrap">${checks}</div>
      <div class="grid grid-cols-2 gap-4 items-end">
        ${campoTexto("f-orden", "Orden", p ? p.orden : 0, { type: "number" })}
        <label class="flex items-center gap-2 font-body-md pb-2">
          <input type="checkbox" id="f-activo" ${!p || p.activo ? "checked" : ""} /> Visible en el sitio
        </label>
      </div>
    `, async () => {
      const payload = {
        nombre_es: $("f-nombre-es").value.trim(),
        nombre_en: $("f-nombre-en").value.trim(),
        desc_es: $("f-desc-es").value.trim(),
        desc_en: $("f-desc-en").value.trim(),
        precio: Number($("f-precio").value) || 0,
        category: $("f-categoria").value,
        img: $("f-img").value.trim(),
        tags: TAGS_DISPONIBLES.filter((t) => $("f-tag-" + t.id).checked).map((t) => t.id),
        orden: Number($("f-orden").value) || 0,
        activo: $("f-activo").checked,
      };

      if (!payload.nombre_es || !payload.nombre_en) {
        errorEditor("El nombre en español e inglés son obligatorios."); return;
      }

      const q = nuevo
        ? sb.from("menu_items").insert(payload)
        : sb.from("menu_items").update(payload).eq("id", id);
      const { error } = await q;
      if (error) { errorEditor("No se pudo guardar: " + error.message); return; }

      cerrarEditor();
      toast(nuevo ? "Plato creado" : "Plato actualizado");
      await cargarMenu();
    });
  }

  async function borrarPlato(id) {
    const p = platos.find((x) => x.id === id);
    if (!p || !confirm(`¿Borrar "${p.nombre_es}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await sb.from("menu_items").delete().eq("id", id);
    if (error) { toast("No se pudo borrar", "error"); return; }
    toast("Plato borrado");
    await cargarMenu();
  }

  // ---------------------------- Eventos ----------------------------
  function abrirEditorEvento(id, diaPorDefecto) {
    const e = id ? eventos.find((x) => x.id === id) : null;
    const nuevo = !e;
    const diaSel = e ? e.dia : (diaPorDefecto != null ? diaPorDefecto : 0);

    const opciones = DIAS.map((d, i) =>
      `<option value="${i}" ${i === diaSel ? "selected" : ""}>${d}</option>`).join("");

    abrirEditor(nuevo ? "Nuevo evento" : "Editar evento", `
      ${campoTexto("f-nombre-es", "Nombre (español)", e ? e.nombre_es : "")}
      ${campoTexto("f-nombre-en", "Nombre (inglés)", e ? e.nombre_en : "")}
      ${campoTexto("f-desc-es", "Descripción (español)", e ? e.desc_es : "", { textarea: true })}
      ${campoTexto("f-desc-en", "Descripción (inglés)", e ? e.desc_en : "", { textarea: true })}
      <div>
        <label for="f-dia" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">Día de la semana</label>
        <select id="f-dia" class="w-full border border-outline-variant px-3 py-2 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary">${opciones}</select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        ${campoTexto("f-hora-inicio", "Hora de inicio", e ? hhmm(e.hora_inicio) : "19:00", { type: "time" })}
        ${campoTexto("f-hora-fin", "Hora de fin", e ? hhmm(e.hora_fin) : "22:00", { type: "time" })}
      </div>
      <p id="f-aviso-horario" class="hidden font-body-md text-on-surface-variant text-sm"></p>
      ${campoImagen(e ? e.img : "")}
      <div class="grid grid-cols-2 gap-4 items-end">
        ${campoTexto("f-orden", "Orden", e ? e.orden : 0, { type: "number" })}
        <label class="flex items-center gap-2 font-body-md pb-2">
          <input type="checkbox" id="f-activo" ${!e || e.activo ? "checked" : ""} /> Visible en el sitio
        </label>
      </div>
    `, async () => {
      const payload = {
        nombre_es: $("f-nombre-es").value.trim(),
        nombre_en: $("f-nombre-en").value.trim(),
        desc_es: $("f-desc-es").value.trim(),
        desc_en: $("f-desc-en").value.trim(),
        dia: Number($("f-dia").value),
        hora_inicio: $("f-hora-inicio").value,
        hora_fin: $("f-hora-fin").value,
        img: $("f-img").value.trim(),
        orden: Number($("f-orden").value) || 0,
        activo: $("f-activo").checked,
      };

      if (!payload.nombre_es || !payload.nombre_en) {
        errorEditor("El nombre en español e inglés son obligatorios."); return;
      }

      const q = nuevo
        ? sb.from("events_weekly").insert(payload)
        : sb.from("events_weekly").update(payload).eq("id", id);
      const { error } = await q;
      if (error) { errorEditor("No se pudo guardar: " + error.message); return; }

      cerrarEditor();
      toast(nuevo ? "Evento creado" : "Evento actualizado");
      await cargarEventos();
    });

    // Aviso no bloqueante de cruce de medianoche
    const chequear = () => {
      const el = $("f-aviso-horario");
      if ($("f-hora-fin").value <= $("f-hora-inicio").value) {
        el.textContent = "Nota: la hora de fin es anterior o igual a la de inicio; se interpretará como que el evento cruza la medianoche.";
        show(el);
      } else hide(el);
    };
    $("f-hora-inicio").addEventListener("change", chequear);
    $("f-hora-fin").addEventListener("change", chequear);
    chequear();
  }

  async function borrarEvento(id) {
    const e = eventos.find((x) => x.id === id);
    if (!e || !confirm(`¿Borrar "${e.nombre_es}" del ${DIAS[e.dia]}?`)) return;
    const { error } = await sb.from("events_weekly").delete().eq("id", id);
    if (error) { toast("No se pudo borrar", "error"); return; }
    toast("Evento borrado");
    await cargarEventos();
  }

  // ------------------------------------------------------------------
  // Acciones: CSV, respaldo JS
  // ------------------------------------------------------------------
  function wireActions() {
    $("new-dish-btn").addEventListener("click", () => abrirEditorPlato(null));
    $("new-event-btn").addEventListener("click", () => abrirEditorEvento(null));
    $("export-csv-btn").addEventListener("click", exportarCSV);
    $("export-backup-btn").addEventListener("click", exportarRespaldo);
  }

  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportarCSV() {
    if (!leads.length) { toast("No hay suscriptores que exportar", "error"); return; }
    // Escapado CSV: duplicar comillas y envolver todo entre comillas.
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const filas = [
      ["Nombre", "Correo", "Idioma", "Origen", "Fecha"].map(q).join(","),
      ...leads.map((l) => [l.nombre, l.email, l.idioma || "", l.origen || "", l.created_at].map(q).join(",")),
    ];
    // BOM UTF-8 para que Excel respete las tildes
    descargar(`suscriptores-${new Date().toISOString().slice(0, 10)}.csv`,
      "﻿" + filas.join("\r\n"), "text/csv;charset=utf-8");
    toast("CSV descargado");
  }

  function exportarRespaldo() {
    const js = (v) => JSON.stringify(v);

    const menuJs = `// ⚠️ PRECIOS ESTIMADOS — revisar antes de publicar.
// Generado desde el panel de administración el ${new Date().toLocaleString("es-DO")}.
// Este archivo es el RESPALDO que ve el visitante cuando no tiene conexión.

const MENU_CATEGORIES = [
${categorias.filter((c) => c.activo).map((c) =>
  `  { id: ${js(c.id)}, label: { es: ${js(c.label_es)}, en: ${js(c.label_en)} } },`).join("\n")}
];

const MENU_ITEMS = [
${platos.filter((p) => p.activo).map((p) => `  {
    id: ${js(p.slug || p.id)},
    category: ${js(p.category)},
    nombre: { es: ${js(p.nombre_es)}, en: ${js(p.nombre_en)} },
    desc: {
      es: ${js(p.desc_es)},
      en: ${js(p.desc_en)},
    },
    precio: ${Number(p.precio)},
    img: ${js(p.img)},
    tags: ${js(p.tags || [])},
  },`).join("\n")}
];
`;

    const eventsJs = `// ⚠️ HORARIO ESTIMADO — confirmar con el negocio.
// Generado desde el panel de administración el ${new Date().toLocaleString("es-DO")}.
// Este archivo es el RESPALDO que ve el visitante cuando no tiene conexión.
//
// day: 0=domingo, 1=lunes ... 6=sábado (índice de Date.getDay())

const EVENTS_WEEKLY = [
${eventos.filter((e) => e.activo).map((e) => `  {
    day: ${e.dia},
    nombre: { es: ${js(e.nombre_es)}, en: ${js(e.nombre_en)} },
    desc: {
      es: ${js(e.desc_es)},
      en: ${js(e.desc_en)},
    },
    horaInicio: ${js(hhmm(e.hora_inicio))},
    horaFin: ${js(hhmm(e.hora_fin))},
    img: ${js(e.img)},
  },`).join("\n")}
];
`;

    descargar("menu-data.js", menuJs, "text/javascript;charset=utf-8");
    setTimeout(() => descargar("events-data.js", eventsJs, "text/javascript;charset=utf-8"), 300);

    localStorage.setItem("enjoy-last-export", new Date().toISOString());
    mostrarUltimaExportacion();
    toast("Respaldo descargado — súbelo a la carpeta js/");
  }

  function mostrarUltimaExportacion() {
    const el = $("last-export");
    const iso = localStorage.getItem("enjoy-last-export");
    if (!iso) {
      el.textContent = "Nunca se ha exportado el respaldo desde este navegador.";
      el.className = "font-body-md text-error text-sm mb-4";
      return;
    }
    const dias = Math.floor((Date.now() - new Date(iso)) / 86400000);
    el.textContent = `Última exportación: ${formatFecha(iso)}` +
      (dias > 30 ? ` — hace ${dias} días, conviene actualizarlo.` : "");
    el.className = "font-body-md text-sm mb-4 " + (dias > 30 ? "text-error" : "text-on-surface-variant");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
