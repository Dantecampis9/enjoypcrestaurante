# Enjoy Punta Cana — Website

Sitio web para **Enjoy PC Restaurante**, restaurante en Los Corales, Bávaro, Punta Cana (República Dominicana). Cocina italiana, caribeña e internacional. El negocio no tenía web propia antes de este proyecto — solo existía en Instagram, Facebook y directorios de terceros.

## Restricciones duras

- **Sin build, sin `npm`, sin frameworks.** HTML estático + Tailwind (motor JIT del Play CDN). No introducir bundlers, React, Astro, etc. sin preguntar antes.
- **No añadir dependencias nuevas** (librerías JS, servicios externos de formularios, analytics, etc.) sin confirmarlo con el usuario primero.
- Cualquier página nueva debe seguir la misma estructura de `<head>` y nav que `index.html`, `menu.html`, `eventos.html`, `galeria.html` y `contacto.html`.

## Assets auto-alojados (sin CDN)

El sitio **no depende de internet** para verse bien — Tailwind y las fuentes se descargaron una vez y se sirven como archivos locales:

- `js/tailwind-cdn.js` — copia local del motor JIT de Tailwind Play CDN (`cdn.tailwindcss.com`). Genera las clases de utilidad en el navegador igual que el CDN, pero sin llamar a ningún servidor externo.
- `fonts/*.woff2` + `css/fonts.css` — Playfair Display, Hanken Grotesk y Material Symbols Outlined, descargadas de Google Fonts (subset `latin`, cubre español e inglés). Son variable fonts: un solo archivo cubre varios pesos vía `font-weight: 400 700` en el `@font-face`.
- El único recurso que sigue necesitando red es el `<iframe>` de Google Maps en `contacto.html` (es un mapa en vivo, no un asset estático).
- Si se actualiza `js/tailwind-config.js` con nuevas clases, `js/tailwind-cdn.js` no necesita volver a descargarse — sigue siendo el motor genérico, solo lee la config.
- No reemplazar estos archivos locales por los `<script>`/`<link>` originales de CDN sin que el usuario lo pida explícitamente — el motivo de este cambio fue que el sitio se veía completamente sin estilos cuando no había conexión a internet.

## Backend: Supabase (panel de administración)

El sitio tiene un panel privado en `admin.html` para gestionar menú, eventos, galería (fotos y video) y suscriptores. La instalación paso a paso está en **`sql/README.md`**.

### La regla que ordena todo lo demás

> **Las páginas públicas NO cargan el SDK de Supabase.** Hablan con la API REST (PostgREST) con `fetch()` nativo desde `js/data-source.js`. El SDK (~120 KB de terceros) solo se carga en `admin.html`.

Esto existe para no romper la restricción offline de arriba. El patrón es **render optimista con revalidación**:

1. `menu.html`, `eventos.html` y `galeria.html` pintan de inmediato con `js/menu-data.js` / `js/events-data.js` / `js/gallery-data.js` (comportamiento de siempre, sin esperas).
2. En segundo plano consultan Supabase.
3. Si responde, re-renderizan; si falla, se queda lo local.

Por eso **`js/menu-data.js`, `js/events-data.js` y `js/gallery-data.js` no se borran**: son el respaldo offline. El panel tiene un botón "Exportar respaldo JS" que los regenera (los 3 archivos); hay que subirlos al repo tras hacer cambios o el respaldo se queda anticuado.

`admin.html` **sí requiere internet** y **sí carga un script externo**: es una excepción consciente y necesaria (un panel sobre una base remota no puede funcionar sin red). Es la única página con esa excepción.

### Seguridad — leer antes de tocar nada de esto

- La `anonKey` en `js/supabase-config.js` **va expuesta en el frontend por diseño**. No es un secreto: identifica el proyecto. Lo único que protege los datos son los GRANT y las políticas RLS de `sql/02-rls.sql`.
- **La `service_role` key NUNCA debe entrar al repositorio.** Ignora RLS por completo: quien la tenga lee todos los correos, borra el menú y crea administradores.
- `leads` sigue siendo asimétrica en la base de datos: **INSERT público** (pensado para que cualquier formulario futuro pueda guardar sin sesión) pero **SELECT solo para admins** (un visitante jamás debe leer los correos de otros). Ni GRANT ni política de SELECT para `anon`. Actualmente **no hay ningún formulario público que use este INSERT** (el modal de bienvenida que lo hacía fue retirado); la tabla y las políticas quedaron intactas para si se reintroduce una captura de correos más adelante.
- **Detalle no obvio si se vuelve a usar ese INSERT público:** PostgREST ejecuta `INSERT ... RETURNING *` por defecto, y ese `RETURNING` activa las políticas de SELECT. Como `anon` no puede leer `leads`, el INSERT fallaría. Cualquier código que inserte ahí debe enviar la cabecera `Prefer: return=minimal`.
- El ocultar/mostrar vistas de `js/admin.js` no es seguridad: es cosmética. Quien evada el JS con DevTools se encontrará con que Postgres rechaza cada operación.
- Los textos ahora son editables desde el panel, así que ya no son constantes de confianza: usar `escapeHtml()` (en `js/data-source.js`) al interpolar en `innerHTML`.

### Modelo de datos

- Columnas planas `nombre_es` / `nombre_en`, no `jsonb`. `js/data-source.js` las normaliza a la forma anidada `{es, en}` que ya esperaban las plantillas, así el render y el i18n no cambiaron.
- **Eventos: no hay `unique` sobre `dia`.** Se permiten varios eventos el mismo día y días sin ninguno. `eventos.html` maneja 0, 1 o N eventos por día.
- **Las 6 categorías del menú son fijas** — el panel no permite crearlas ni borrarlas (decisión del usuario). Los platos sí son CRUD completo.
- `activo = false` despublica sin borrar. El fetch público filtra `activo=eq.true`.
- Fotos: las de `img/platos/` e `img/ambiente/` **siguen siendo archivos locales** (funcionan offline). Las nuevas que suba el dueño van al bucket `media` de Storage. El campo `img` acepta ambas formas.
- **Galería (`gallery_items`):** mismo patrón que menú/eventos (lectura pública de `activo=true`, escritura solo admin). Campo `tipo` en `'imagen'` o `'video'`; `archivo` acepta ruta local o URL de Storage, igual que `img`. El bucket `media` admite hasta **50 MB por archivo** y los MIME de video (`video/mp4`, `video/quicktime`, `video/webm`) desde `sql/03-storage.sql` — las subidas de fotos de platos/eventos siguen limitadas a 5 MB en el cliente (`MAX_IMG_BYTES` en `js/admin.js`), la de galería usa `MAX_GALLERY_BYTES` (50 MB) por separado. `galeria.html` no fuerza aspect ratio: un video vertical de smartphone (9:16) se acomoda solo en el masonry.
- `admin.html` está en **español únicamente**, sin `data-i18n`: es una herramienta interna, no contenido de cara al visitante. Excepción consciente a la regla de i18n.
- `admin.html` lleva `noindex` y **no** está en `sitemap.xml`. **No añadir `Disallow: /admin.html` a `robots.txt`** — eso publicaría la ruta.

## Design system

Los tokens de color, tipografía y espaciado viven en **`js/tailwind-config.js`** — es la única paleta autorizada. No inventar colores hexadecimales sueltos ni fuentes nuevas.

- Colores: usar clases como `bg-primary`, `text-secondary`, `bg-surface-container`, nunca hex directo en el HTML.
- Tipografía: `font-display-lg` / `font-headline-md` / `font-headline-sm` (Playfair Display) para títulos; `font-body-md` / `font-body-lg` / `font-label-caps` (Hanken Grotesk) para el resto.
- `primary` = naranja terracota `#9f3d04`; `secondary` = azul océano `#436083`.
- **El logo tiene su propia paleta** (rosa/magenta, verde, beige, naranja — ver `img/logo/enjoy-logo.png`) que no coincide con `primary`/`secondary`. Es intencional: es la marca real del restaurante, se usa tal cual sobre fondos claros (nav, footer) y no se debe recolorear.

## Internacionalización (ES/EN)

**Ningún texto visible se escribe directo en el HTML.** El patrón es:

1. Escribir el texto en español como contenido de fallback dentro de la etiqueta (para que la página sea legible sin JS).
2. Añadir `data-i18n="clave.punto.punto"` (o `data-i18n-aria`, `data-i18n-placeholder`, `data-i18n-alt` para atributos).
3. Añadir la misma clave en **ambos** diccionarios (`es` y `en`) dentro de `js/i18n.js` — nunca solo en uno.

El selector de idioma persiste en `localStorage` (`enjoy-lang`) y se inicializa por defecto según `navigator.language`. El script `js/i18n.js` debe cargarse **al final del `<body>`**, después de cualquier script que genere contenido dinámico (como `menu-data.js` en `menu.html`), para que `I18N.init()` encuentre ya el DOM completo.

## Datos de contacto

Viven **solo** en `js/business.js` (objeto `BUSINESS`). Si necesitas el teléfono, dirección u horario en una página nueva, escríbelos igual que en las páginas existentes (por ahora se repiten como texto porque no hay renderizado dinámico de estos datos, pero el valor de referencia y verificación está en ese archivo). No hardcodear un teléfono o dirección distintos sin actualizar `business.js` primero.

## Qué está verificado y qué no

| Dato | Estado |
| --- | --- |
| Nombre, dirección, horario, teléfono `+1 809-898-6193` | Verificado cruzando Tripadvisor + Now In Punta Cana |
| Valoración 4.3/5 (46 reseñas), servicios (terraza, música en vivo, WiFi, parking, etc.) | Verificado (Tripadvisor) |
| Nombres de platos en `js/menu-data.js` | Verificados — extraídos de reseñas reales |
| **Precios en `js/menu-data.js`** | **Inventados.** No existe lista de precios pública. Marcado con comentario de advertencia en el propio archivo. Revisar antes de publicar. |
| **Email de contacto** | **No existe.** `BUSINESS.email` está vacío. `contacto.html` muestra "Próximamente" en vez de un email roto. Si el usuario da uno, actualizar `business.js` y quitar el estado "pendiente" del HTML. |
| Fotos en `img/platos/` y `img/ambiente/` | Reales del local, pero **descargadas de nowinpuntacana.com** (directorio de terceros), no de Instagram directamente — Instagram está tras login y no fue accesible. Confirmar derechos de uso antes de publicar. |
| Logo (`img/logo/enjoy-logo.png`) | Mismo origen que las fotos; es el logo real del negocio. |
| Teléfono alternativo `809-763-5088` visto en una sola fuente | Descartado a favor de `898-6193`, confirmado por 2 fuentes. |
| Existencia de música en vivo por las noches | Verificado (mencionado en reseñas de Tripadvisor). |
| **Días y horas de cada evento** | **Inventados.** No existe un calendario público de eventos. Es un horario plantilla semanal razonable (música en vivo / jazz / DJ rotando por día), marcado con advertencia en `js/events-data.js` y `sql/04-seed.sql`. El dueño puede corregirlo desde `admin.html`. |
| **Correos capturados antes del panel** | **Perdidos.** El antiguo modal de bienvenida (ya retirado) los guardaba en el `localStorage` de cada visitante, no en un servidor: eran técnicamente inalcanzables. |

## Página de Eventos (`eventos.html`)

- Fuente de datos: tabla `events_weekly` de Supabase, con `js/events-data.js` (`EVENTS_WEEKLY`) como respaldo offline.
- Es un **horario recurrente semanal** (`day: 0-6`, mismo índice que `Date.getDay()`), no un calendario con fechas concretas. Pueden coexistir **varios eventos el mismo día** y **días sin ningún evento**.
- "Hoy" se calcula con `new Date().getDay()`. Si hay varios eventos hoy, el primero va como tarjeta destacada y el resto debajo. Si no hay ninguno, se muestra `events.today.empty`.
- "Próximos eventos" recorre los siguientes 6 días; los días vacíos se omiten y los que tienen varios aportan una tarjeta por evento.
- Los horarios se formatean en 12h con AM/PM vía `formatHour` inline, igual que el horario del restaurante en `contacto.html`.
- **Eventos puntuales con fecha concreta** (ej. "Fin de Año, 31 dic") siguen **fuera de alcance**. Requerirían una columna `fecha date` en `events_weekly` y lógica de prioridad en el render — no forzarlo dentro de `dia`.

## Convenciones de imágenes

- Carpetas: `img/logo/`, `img/platos/`, `img/ambiente/`.
- Todo `<img>` lleva `loading="lazy"` (excepto el logo del nav, que es LCP-crítico) y `width`/`height` explícitos para evitar layout shift.
- Nombres de archivo descriptivos en español (ya renombrados desde los nombres genéricos de origen).

## Cómo servir en local

```bash
python -m http.server 8000
```

y abrir `http://localhost:8000`. No requiere instalación de dependencias.

## Pendientes para el dueño del negocio

1. **Montar Supabase** siguiendo `sql/README.md` — sin esto el panel no funciona y los correos no se guardan.
2. Confirmar o dar un email de contacto real.
3. Revisar y corregir todos los precios del menú (ya se puede desde `admin.html`).
4. Confirmar derechos de uso de las fotos, o sustituirlas por originales en alta resolución.
5. Confirmar el teléfono correcto.
6. Confirmar los días y horarios reales de música en vivo / DJ / eventos especiales (ya se puede desde `admin.html`).
7. Tras cada tanda de cambios en el panel: pulsar **"Exportar respaldo JS"** y subir los dos archivos a `js/`, para que el respaldo offline no se quede anticuado.
