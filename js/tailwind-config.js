tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Paleta de marca (identidad oficial del logo/flyer de Enjoy PC Restaurante):
        // rosa #EA3E70, verde #5F8755, naranja #F7B24B, amarillo #E5E060, malva #8F4C6F.
        // Reemplaza la paleta genérica terracota/azul océano anterior.
        //
        // on-primary/on-secondary/on-tertiary/on-accent-gold son negros (no blancos):
        // rosa, verde, naranja y amarillo son demasiado claros para que el blanco
        // llegue al contraste 4.5:1 exigido por WCAG AA con texto pequeño (botones
        // usan font-label-caps de 12px). Negro sí lo cumple en los cuatro. El malva
        // es la excepción: es oscuro, así que ahí el texto es blanco.
        //
        // Repaso de paleta (pedido explícito del dueño): botones a coral #E36A56
        // (antes rosa #EA3E70), texto de cuerpo y texto secundario a negro puro,
        // y un nuevo tono teal #2E6E78 exclusivo para títulos reales (headings),
        // separado de "primary" para que cambiar el color de los botones no
        // recoloree también los títulos. Ver `title` más abajo.
        "on-tertiary-fixed-variant": "#6f5022",
        error: "#ba1a1a",
        "on-secondary-fixed": "#395133",
        "on-error": "#ffffff",
        "on-primary-fixed-variant": "#751f38",
        "surface-dim": "#dcd9d9",
        "primary-container": "#aa5041",
        "on-secondary": "#000000",
        "outline-variant": "#dec0b5",
        "primary-fixed-dim": "#f6a8be",
        "error-container": "#ffdad6",
        "secondary-fixed-dim": "#9fb799",
        "on-surface-variant": "#000000",
        "surface-bright": "#fcf9f8",
        surface: "#fcf9f8",
        "surface-tint": "#e36a56",
        "tertiary-fixed-dim": "#fad193",
        "tertiary-fixed": "#fef4e4",
        "surface-container-highest": "#e5e2e1",
        secondary: "#5f8755",
        "on-primary": "#000000",
        "on-background": "#1c1b1b",
        "surface-container": "#f0eded",
        "surface-container-lowest": "#ffffff",
        "on-secondary-fixed-variant": "#4c6b45",
        "inverse-surface": "#313030",
        "surface-container-low": "#f6f3f2",
        "on-secondary-container": "#395133",
        "primary-fixed": "#fbe9e6",
        "secondary-fixed": "#dcebd4",
        "on-primary-fixed": "#3d0a1e",
        "on-tertiary-fixed": "#4a3517",
        "on-tertiary": "#000000",
        "surface-variant": "#e5e2e1",
        "on-tertiary-container": "#000000",
        "inverse-primary": "#f6a8be",
        "on-primary-container": "#ffffff",
        background: "#fcf9f8",
        "inverse-on-surface": "#f3f0ef",
        "tertiary-container": "#b98638",
        tertiary: "#f7b24b",
        "on-surface": "#000000",
        primary: "#e36a56",
        "surface-container-high": "#eae7e7",
        "secondary-container": "#e7ede6",
        outline: "#8a7268",
        "on-error-container": "#93000a",
        // Acentos nuevos sin equivalente en el sistema primary/secondary/tertiary anterior.
        "accent-gold": "#e5e060",
        "on-accent-gold": "#000000",
        "accent-plum": "#8f4c6f",
        "on-accent-plum": "#ffffff",
        // Título: exclusivo para encabezados reales (h1-h4 / font-display-lg /
        // font-headline-md / font-headline-sm). Separado de "primary" a propósito:
        // "primary" ahora es el color de los botones/CTAs, y no debe cambiar el
        // color de los títulos si el negocio vuelve a pedir otro color de botón.
        title: "#2e6e78",
      },
      borderRadius: {
        // "full" estaba fijo en 0.75rem: los 56 usos de rounded-full del sitio
        // (logo, íconos de redes, píldoras de idioma, avatares) salían como
        // cuadrados con esquina apenas redondeada, no círculos/píldoras reales.
        // 9999px es el valor estándar de Tailwind para "full" — corrige eso.
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        full: "9999px",
      },
      spacing: {
        "section-gap": "80px",
        base: "8px",
        "margin-mobile": "16px",
        "container-max": "1200px",
        gutter: "24px",
      },
      fontFamily: {
        "headline-sm": ["Playfair Display"],
        "display-lg-mobile": ["Playfair Display"],
        "body-lg": ["Hanken Grotesk"],
        "label-caps": ["Hanken Grotesk"],
        "display-lg": ["Playfair Display"],
        "body-md": ["Hanken Grotesk"],
        "headline-md": ["Playfair Display"],
      },
      fontSize: {
        "headline-sm": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "display-lg-mobile": ["40px", { lineHeight: "48px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.1em", fontWeight: "600" }],
        "display-lg": ["64px", { lineHeight: "72px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-md": ["32px", { lineHeight: "40px", fontWeight: "600" }],
      },
    },
  },
};
