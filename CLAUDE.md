# Enjoy Punta Cana — Website

Sitio web para **Enjoy PC Restaurante**, restaurante en Los Corales, Bávaro, Punta Cana (República Dominicana). Cocina italiana, caribeña e internacional. El negocio no tenía web propia antes de este proyecto — solo existía en Instagram, Facebook y directorios de terceros.

## Restricciones duras

- **Sin build, sin `npm`, sin frameworks.** HTML estático + Tailwind vía Play CDN (`cdn.tailwindcss.com`). No introducir bundlers, React, Astro, etc. sin preguntar antes.
- **No añadir dependencias nuevas** (librerías JS, servicios externos de formularios, analytics, etc.) sin confirmarlo con el usuario primero.
- Cualquier página nueva debe seguir la misma estructura de `<head>` y nav que `index.html`, `menu.html`, `galeria.html` y `contacto.html`.

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
|---|---|
| Nombre, dirección, horario, teléfono `+1 809-898-6193` | Verificado cruzando Tripadvisor + Now In Punta Cana |
| Valoración 4.3/5 (46 reseñas), servicios (terraza, música en vivo, WiFi, parking, etc.) | Verificado (Tripadvisor) |
| Nombres de platos en `js/menu-data.js` | Verificados — extraídos de reseñas reales |
| **Precios en `js/menu-data.js`** | **Inventados.** No existe lista de precios pública. Marcado con comentario de advertencia en el propio archivo. Revisar antes de publicar. |
| **Email de contacto** | **No existe.** `BUSINESS.email` está vacío. `contacto.html` muestra "Próximamente" en vez de un email roto. Si el usuario da uno, actualizar `business.js` y quitar el estado "pendiente" del HTML. |
| Fotos en `img/platos/` y `img/ambiente/` | Reales del local, pero **descargadas de nowinpuntacana.com** (directorio de terceros), no de Instagram directamente — Instagram está tras login y no fue accesible. Confirmar derechos de uso antes de publicar. |
| Logo (`img/logo/enjoy-logo.png`) | Mismo origen que las fotos; es el logo real del negocio. |
| Teléfono alternativo `809-763-5088` visto en una sola fuente | Descartado a favor de `898-6193`, confirmado por 2 fuentes. |

## Convenciones de imágenes

- Carpetas: `img/logo/`, `img/platos/`, `img/ambiente/`.
- Todo `<img>` lleva `loading="lazy"` (excepto el logo del nav, que es LCP-crítico) y `width`/`height` explícitos para evitar layout shift.
- Nombres de archivo descriptivos en español (ya renombrados desde los nombres genéricos de origen).

## Cómo servir en local

```
python -m http.server 8000
```

y abrir `http://localhost:8000`. No requiere instalación de dependencias.

## Pendientes para el dueño del negocio

1. Confirmar o dar un email de contacto real.
2. Revisar y corregir todos los precios del menú.
3. Confirmar derechos de uso de las fotos, o sustituirlas por originales en alta resolución.
4. Confirmar el teléfono correcto.
