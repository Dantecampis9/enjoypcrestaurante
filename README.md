# Enjoy Punta Cana

Sitio web estático y bilingüe (ES/EN) para Enjoy PC Restaurante, Los Corales, Bávaro, Punta Cana.

## Servir en local

```
python -m http.server 8000
```

Abrir `http://localhost:8000`.

No requiere `npm install` ni build: es HTML/CSS/JS plano, Tailwind se carga por CDN.

## Estructura

```
index.html      Home
menu.html       Menú digital
galeria.html    Galería con lightbox
contacto.html   Contacto, ubicación, horarios, servicios
css/styles.css  Estilos propios (nav, lightbox, print)
js/
  tailwind-config.js  Tokens de diseño (colores, tipografía)
  business.js         Datos de contacto — única fuente de verdad
  menu-data.js        Platos del menú (⚠️ precios estimados, revisar antes de publicar)
  i18n.js             Diccionarios ES/EN y selector de idioma
  main.js             Nav, menú móvil, lightbox, año del footer
img/
  logo/       Logo del restaurante
  platos/     Fotos de comida y bebida
  ambiente/   Fotos del local, música en vivo, ambiente
```

## Publicar

Cualquier hosting estático sirve: Netlify, Vercel, GitHub Pages, o el hosting que ya tenga el dominio. Solo hay que subir la carpeta tal cual.

## Antes de publicar — pendientes reales

Ver la sección "Pendientes para el dueño del negocio" en [CLAUDE.md](CLAUDE.md):

1. Email de contacto (no existe uno público verificado).
2. Revisar todos los precios del menú (son estimados).
3. Confirmar derechos de las fotos (vienen de un directorio de terceros, no de Instagram).
4. Confirmar el teléfono correcto.
