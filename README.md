# Enjoy Punta Cana

Sitio web estático y bilingüe (ES/EN) para Enjoy PC Restaurante, Los Corales, Bávaro, Punta Cana.

## Servir en local

```bash
python -m http.server 8000
```

Abrir `http://localhost:8000`.

No requiere `npm install` ni build: es HTML/CSS/JS plano. Tailwind y las fuentes están auto-alojadas, así que el sitio se ve bien incluso sin conexión a internet.

## Estructura

```
index.html      Home
menu.html       Menú digital
eventos.html    Eventos de hoy y próximos
galeria.html    Galería con lightbox
contacto.html   Contacto, ubicación, horarios, servicios
admin.html      Panel de administración (privado, con login)

css/
  styles.css    Estilos propios (nav, lightbox, print)
  fonts.css     @font-face de las fuentes auto-alojadas
fonts/          Playfair Display, Hanken Grotesk, Material Symbols (.woff2)
js/
  tailwind-cdn.js     Motor de Tailwind (copia local, no CDN)
  tailwind-config.js  Tokens de diseño (colores, tipografía)
  business.js         Datos de contacto — única fuente de verdad
  menu-data.js        Menú — respaldo offline (⚠️ precios estimados)
  events-data.js      Eventos — respaldo offline (⚠️ horarios estimados)
  data-source.js      Lee de Supabase con fallback a los archivos locales
  supabase-config.js  URL y clave pública del proyecto Supabase
  i18n.js             Diccionarios ES/EN y selector de idioma
  lead-modal.js       Modal de bienvenida (captura nombre/correo)
  admin.js            Lógica del panel de administración
  main.js             Nav, menú móvil, lightbox, año del footer
sql/                  Scripts de instalación de Supabase (ver sql/README.md)
img/
  logo/       Logo del restaurante
  platos/     Fotos de comida y bebida
  ambiente/   Fotos del local, música en vivo, ambiente
```

## Panel de administración

`admin.html` permite gestionar el menú, los eventos y ver los suscriptores, sin tocar código. No aparece en el menú de navegación y requiere iniciar sesión.

**Necesita configurarse una vez**: sigue los pasos de [`sql/README.md`](sql/README.md). Hasta entonces el sitio funciona con normalidad usando los datos locales, pero el panel avisará de que falta configurarlo y los correos del modal no se guardarán en ningún sitio.

### Cómo funciona

El sitio público **no depende de Supabase para verse**: pinta primero con los datos locales de `js/menu-data.js` / `js/events-data.js` y luego los actualiza si la base de datos responde. Sin internet, sigue funcionando con los datos locales.

Por eso, **tras hacer cambios en el panel** conviene pulsar *"Exportar respaldo JS"* y sustituir esos dos archivos en `js/`, para que quien visite el sitio sin conexión también vea el contenido actualizado.

## Publicar

Cualquier hosting estático sirve: Netlify, Vercel, GitHub Pages, o el hosting que ya tenga el dominio. Solo hay que subir la carpeta tal cual.

> ⚠️ Antes de subir, comprueba que `js/supabase-config.js` contiene la clave **`anon` / `public`** y **nunca** la `service_role`. Esa segunda clave ignora toda la seguridad de la base de datos.

## Antes de publicar — pendientes reales

Ver la sección "Pendientes para el dueño del negocio" en [CLAUDE.md](CLAUDE.md):

1. **Montar Supabase** siguiendo [`sql/README.md`](sql/README.md) — sin esto no hay panel ni captura de correos.
2. Email de contacto (no existe uno público verificado).
3. Revisar todos los precios del menú (son estimados) — ya se puede desde el panel.
4. Confirmar los días y horarios reales de los eventos — ya se puede desde el panel.
5. Confirmar derechos de las fotos (vienen de un directorio de terceros, no de Instagram).
6. Confirmar el teléfono correcto.
