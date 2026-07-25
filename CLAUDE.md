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
| **Días y horas de cada evento en `js/events-data.js`** | **Inventados.** No existe un calendario público de eventos. Es un horario plantilla semanal razonable (música en vivo / jazz / DJ rotando por día), marcado con comentario de advertencia en el propio archivo. Revisar y ajustar con el dueño antes de publicar. |

## Página de Eventos (`eventos.html`)

- Los datos viven en `js/events-data.js`, un array `EVENTS_WEEKLY` con **un evento por día de la semana** (`day: 0-6`, mismo índice que `Date.getDay()`), no un calendario con fechas específicas — es un horario recurrente semanal, no eventos puntuales.
- La página calcula "Hoy" con `new Date().getDay()` y "Próximos eventos" recorriendo los siguientes 6 días desde mañana. Si se necesita en el futuro soportar eventos puntuales (ej. "Noche de Año Nuevo" en una fecha específica que rompa el patrón semanal), habrá que extender el esquema de datos (añadir un campo `fecha` opcional) — no forzarlo dentro de `day`.
- Los horarios se formatean en 12h con AM/PM vía la función `formatHour` inline en `eventos.html`, igual que el horario del restaurante en `contacto.html`.

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

1. Confirmar o dar un email de contacto real.
2. Revisar y corregir todos los precios del menú.
3. Confirmar derechos de uso de las fotos, o sustituirlas por originales en alta resolución.
4. Confirmar el teléfono correcto.
5. Confirmar los días y horarios reales de música en vivo / DJ / eventos especiales (`js/events-data.js` es un horario plantilla, no confirmado).
