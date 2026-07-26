// Modal de bienvenida (captura de nombre/correo). Se muestra una sola vez por
// navegador: al Aceptar o Cancelar se marca `enjoy-lead-seen` en localStorage y no
// vuelve a aparecer.
//
// Los datos se envían a Supabase (tabla `leads`) a través de DataSource.saveLead().
// El visitante no tiene sesión: la política RLS "leads_insert_publico" permite el
// INSERT anónimo, pero NO el SELECT, así que nadie puede leer los correos ajenos.
//
// Si el envío falla (sin conexión, proyecto pausado), el modal NO bloquea al
// visitante: se cierra igual y el intento queda en cola para reintentarlo en la
// siguiente visita.
(function () {
  const STORAGE_SEEN = "enjoy-lead-seen";
  const STORAGE_PENDING = "enjoy-lead-pending";

  // Reintentar un envío que quedó pendiente de una visita anterior.
  // Se hace siempre, incluso si el modal ya no debe mostrarse.
  (function reintentarPendiente() {
    const raw = localStorage.getItem(STORAGE_PENDING);
    if (!raw || typeof DataSource === "undefined") return;
    let lead;
    try { lead = JSON.parse(raw); } catch (_) { localStorage.removeItem(STORAGE_PENDING); return; }
    DataSource.saveLead(lead).then((ok) => {
      if (ok) localStorage.removeItem(STORAGE_PENDING);
    });
  })();

  if (localStorage.getItem(STORAGE_SEEN)) return;

  function currentLang() {
    return document.documentElement.lang || "es";
  }

  function t(key) {
    return I18N.translate(key, currentLang());
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function buildModal() {
    const overlay = document.createElement("div");
    overlay.id = "lead-modal-overlay";
    overlay.className = "fixed inset-0 z-[200] flex items-center justify-center px-4 lightbox-backdrop";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "lead-modal-title");

    overlay.innerHTML = `
      <div class="bg-surface max-w-md w-full p-8 md:p-10 relative shadow-2xl">
        <button type="button" id="lead-modal-close" class="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors" aria-label="${t("modal.cancel")}">
          <span class="material-symbols-outlined">close</span>
        </button>
        <h2 id="lead-modal-title" class="font-headline-md text-headline-md text-primary mb-2 pr-8">${t("modal.title")}</h2>
        <p class="font-body-md text-on-surface-variant mb-6">${t("modal.subtitle")}</p>
        <form id="lead-modal-form" novalidate>
          <div class="mb-4">
            <label for="lead-name" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">${t("modal.name.label")}</label>
            <input id="lead-name" name="name" type="text" required class="w-full border border-outline-variant px-4 py-3 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary" placeholder="${t("modal.name.placeholder")}" />
          </div>
          <div class="mb-2">
            <label for="lead-email" class="font-label-caps text-label-caps text-on-surface-variant block mb-1">${t("modal.email.label")}</label>
            <input id="lead-email" name="email" type="email" required class="w-full border border-outline-variant px-4 py-3 font-body-md bg-surface focus:outline-none focus:ring-2 focus:ring-primary" placeholder="${t("modal.email.placeholder")}" />
          </div>
          <p id="lead-modal-error" class="hidden text-sm text-error mb-2"></p>
          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="submit" class="flex-1 bg-primary text-on-primary px-6 py-3 font-label-caps text-label-caps hover:bg-primary-container transition-colors">${t("modal.accept")}</button>
            <button type="button" id="lead-modal-cancel" class="flex-1 border border-outline-variant text-on-surface-variant px-6 py-3 font-label-caps text-label-caps hover:bg-surface-container transition-colors">${t("modal.cancel")}</button>
          </div>
        </form>
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const form = overlay.querySelector("#lead-modal-form");
    const errorEl = overlay.querySelector("#lead-modal-error");

    function close() {
      localStorage.setItem(STORAGE_SEEN, "true");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();

      if (!name || !isValidEmail(email)) {
        errorEl.textContent = t("modal.error");
        errorEl.classList.remove("hidden");
        return;
      }

      const lead = {
        nombre: name,
        email: email,
        idioma: currentLang(),
        origen: location.pathname.split("/").pop() || "index.html",
      };

      // Guardar el intento ANTES de enviar: si el envío falla o el visitante
      // cierra la pestaña a mitad, no se pierde el dato.
      localStorage.setItem(STORAGE_PENDING, JSON.stringify(lead));

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const ok = typeof DataSource !== "undefined" ? await DataSource.saveLead(lead) : false;
      if (ok) localStorage.removeItem(STORAGE_PENDING);

      // Se cierra pase lo que pase: un fallo de red no debe dejar al
      // visitante atrapado en el modal.
      close();
    });

    overlay.querySelector("#lead-modal-cancel").addEventListener("click", close);
    overlay.querySelector("#lead-modal-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown);

    overlay.querySelector("#lead-name").focus();
  }

  buildModal();
})();
