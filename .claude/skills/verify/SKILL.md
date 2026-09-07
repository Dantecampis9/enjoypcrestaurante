---
name: verify
description: Cómo levantar y manejar este sitio para verificar cambios en ejecución. Úsalo antes de dar por bueno cualquier cambio en las páginas, el menú, la i18n o el portal cautivo de MikroTik.
---

# Verificar este proyecto

Sitio estático (HTML + Tailwind por CDN local) con el menú en Supabase.
No hay build ni `npm install`: se sirve tal cual y se maneja en navegador.

## Levantar

No hay `python` en esta máquina (solo el stub de la Store). Usa Node.

```bash
# Sitio (crea el servidor si no existe; ROOT = raíz del repo)
node <scratchpad>/static-server.js          # :8000

# Portal cautivo MikroTik, con las variables $(...) simuladas
node mikrotik/preview-server.js             # :8010
```

**Lanza cada servidor como único comando de su llamada en segundo plano.**
Encadenarlo (`node x.js & sleep 1 && curl`) lo mata al cerrarse el shell.

## Manejar

`agent-browser` con sesión propia (preferido sobre el MCP de chrome-devtools):

```bash
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix v)"
agent-browser open http://localhost:8000/menu.html
agent-browser eval --stdin <<'EOF'
(() => JSON.stringify({ tarjetas: document.querySelectorAll('.menu-card').length }))()
EOF
```

## Flujos que vale la pena manejar

| Qué | Cómo |
|---|---|
| Menú real | `menu.html` → 21 pestañas + 257 tarjetas activas, precios `RD$` |
| Menú sin Supabase | Servir con `js/supabase-config.js` reescrito a un host `.invalid`; debe salir el mensaje de error y **cero** tarjetas (no debe caer al menú de muestra de `js/menu-data.js`) |
| Filtro de categoría | `agent-browser click '.menu-tab[data-cat="paellas"]'` → 2 tarjetas |
| Portal WiFi | `:8010` → rellenar los 3 campos → clic en `#trial-link` → debe ir a `/mock-login?dst=...&username=T-<mac>` |
| Trial agotado | `:8010/?trial=no` → aviso, sin formulario ni botón |

## Trampas conocidas

- **`elementFromPoint` devuelve `null` si el elemento está fuera del viewport**, y eso hace parecer que un botón "no es clicable". Haz `scrollintoview` (o `window.scrollTo`) antes de cualquier prueba de impacto o clic.
- **Los filtros del menú son botones con `aria-pressed`** (no `role="tab"`: no hay navegación con flechas ni cambio de panel). El resaltado del filtro activo lo da `css/styles.css` con `.menu-tab[aria-pressed="true"]` — si tocas ese atributo en `menu.html`, actualiza también el CSS o el filtro activo pierde el color. Para clicarlos, el selector `.menu-tab[data-cat="..."]` es lo más fiable.
- **El sandbox bloquea la red saliente** de forma intermitente, incluso con el flag. Si `fetch`/`curl` da `EACCES`, vuelca los datos desde el navegador (`agent-browser eval` con un `fetch`, redirigido a un archivo) y compara en local.
- `galeria.html` tiene un `<img src="">` oculto (el del lightbox). No es un enlace roto.
- Probar el portal con datos válidos **inserta un contacto real** en la tabla `leads`. Bórralo después.

## Verificar el seed sin tocar producción

`sql/04-seed.sql` debe reproducir la base de datos exactamente. Compara
campo a campo parseando el fichero contra un volcado de la API REST, en vez
de ejecutarlo. Para comprobar que Postgres acepta el escapado (apóstrofes,
comillas dobles, acentos, `&`), inserta unas pocas filas difíciles dentro de
`begin; ... rollback;`.

Ojo al parsear: la última fila de cada `INSERT` termina en `)` sin coma
—le sigue `on conflict`— y la línea de nombres de columnas también encaja
con `^  \(.*\)$`. Cuenta solo las que empiezan por `  ('qrfy-`.
