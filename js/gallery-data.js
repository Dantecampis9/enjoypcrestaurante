// Respaldo offline de la galería — igual que menu-data.js / events-data.js:
// galeria.html pinta con esto de inmediato y luego revalida contra Supabase.
// Si editas la galería desde el panel, usa "Exportar respaldo JS" para que
// este archivo no se quede anticuado (el visitante sin conexión solo ve esto).
//
// tipo: "imagen" | "video"

const GALLERY_ITEMS = [
  {
    id: "g01-hero-terraza",
    tipo: "imagen",
    archivo: "img/ambiente/hero-terraza-noche.jpg",
    alt: { es: "Terraza iluminada de noche en Enjoy Punta Cana", en: "Terrace lit up at night at Enjoy Punta Cana" },
  },
  {
    id: "g02-steak",
    tipo: "imagen",
    archivo: "img/platos/steak.jpg",
    alt: { es: "Plato de carne a la parrilla", en: "Grilled steak" },
  },
  {
    id: "g03-musica-vivo",
    tipo: "imagen",
    archivo: "img/ambiente/musica-vivo.jpg",
    alt: { es: "Música en vivo por la noche", en: "Live music at night" },
  },
  {
    id: "g04-cocteles",
    tipo: "imagen",
    archivo: "img/platos/cocteles.jpg",
    alt: { es: "Cócteles de autor", en: "Signature cocktails" },
  },
  {
    id: "g05-ambiente-social-1",
    tipo: "imagen",
    archivo: "img/ambiente/ambiente-social-1.jpg",
    alt: { es: "Ambiente social en la terraza", en: "Social gathering on the terrace" },
  },
  {
    id: "g06-pasta-italiana",
    tipo: "imagen",
    archivo: "img/platos/pasta-italiana.jpg",
    alt: { es: "Pasta italiana artesanal", en: "House-made Italian pasta" },
  },
  {
    id: "g07-dj-noche",
    tipo: "imagen",
    archivo: "img/ambiente/dj-noche.jpg",
    alt: { es: "DJ en vivo por la noche", en: "Live DJ at night" },
  },
  {
    id: "g08-coctel-camarones",
    tipo: "imagen",
    archivo: "img/platos/coctel-camarones.jpg",
    alt: { es: "Cóctel de camarones frescos", en: "Fresh shrimp cocktail" },
  },
  {
    id: "g09-bar-noche",
    tipo: "imagen",
    archivo: "img/ambiente/bar-noche.jpg",
    alt: { es: "Bar iluminado de noche", en: "Bar lit up at night" },
  },
  {
    id: "g10-cheesecake",
    tipo: "imagen",
    archivo: "img/platos/cheesecake.jpg",
    alt: { es: "Cheesecake de la casa", en: "House cheesecake" },
  },
  {
    id: "g11-saxofonista",
    tipo: "imagen",
    archivo: "img/ambiente/saxofonista.jpg",
    alt: { es: "Saxofonista en vivo", en: "Live saxophonist" },
  },
  {
    id: "g12-sangria",
    tipo: "imagen",
    archivo: "img/platos/sangria.jpg",
    alt: { es: "Sangría de la casa", en: "House sangria" },
  },
  {
    id: "g13-ambiente-social-2",
    tipo: "imagen",
    archivo: "img/ambiente/ambiente-social-2.jpg",
    alt: { es: "Ambiente social de noche", en: "Evening social gathering" },
  },
  {
    id: "g14-mamajuana",
    tipo: "imagen",
    archivo: "img/platos/mamajuana.jpg",
    alt: { es: "Mamajuana, trago tradicional dominicano", en: "Mamajuana, traditional Dominican drink" },
  },
  {
    id: "g15-boutique",
    tipo: "imagen",
    archivo: "img/ambiente/boutique.jpg",
    alt: { es: "Boutique de souvenirs", en: "Souvenir boutique" },
  },
  {
    id: "g16-frutas-frescas",
    tipo: "imagen",
    archivo: "img/platos/frutas-frescas.jpg",
    alt: { es: "Frutas frescas de temporada", en: "Fresh seasonal fruit" },
  },
  {
    id: "g17-ambiente-mesa",
    tipo: "imagen",
    archivo: "img/ambiente/ambiente-mesa.jpg",
    alt: { es: "Momento compartido en la mesa", en: "A moment shared at the table" },
  },
  {
    id: "g18-coctel-verde",
    tipo: "imagen",
    archivo: "img/platos/coctel-verde.jpg",
    alt: { es: "Cóctel tropical verde", en: "Tropical green cocktail" },
  },
];
