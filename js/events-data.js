// ⚠️ HORARIO DE EVENTOS ESTIMADO — no existe un calendario público verificado.
// Basado en lo confirmado en reseñas reales (Tripadvisor): el local tiene música en vivo
// por las noches. Los días, horas y nombres específicos de cada evento son un horario
// plantilla razonable, NO datos confirmados por el negocio. Revisar con el dueño antes
// de publicar y ajustar días/horas reales.
//
// day: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado
// (mismo índice que JavaScript Date.getDay())

const EVENTS_WEEKLY = [
  {
    day: 0,
    nombre: { es: "Música en vivo", en: "Live music" },
    desc: {
      es: "Set acústico junto al jardín para cerrar el fin de semana.",
      en: "Acoustic set by the garden to close out the weekend.",
    },
    horaInicio: "19:00",
    horaFin: "22:00",
    img: "img/ambiente/musica-vivo.jpg",
  },
  {
    day: 1,
    nombre: { es: "Noche de Jazz", en: "Jazz Night" },
    desc: {
      es: "Saxofonista en vivo entre platos de la cocina italiana.",
      en: "Live saxophone alongside our Italian kitchen favorites.",
    },
    horaInicio: "19:00",
    horaFin: "22:00",
    img: "img/ambiente/saxofonista.jpg",
  },
  {
    day: 2,
    nombre: { es: "DJ Set", en: "DJ Set" },
    desc: {
      es: "Ritmos tropicales y cócteles de autor en la terraza.",
      en: "Tropical rhythms and signature cocktails on the terrace.",
    },
    horaInicio: "20:00",
    horaFin: "23:00",
    img: "img/ambiente/dj-noche.jpg",
  },
  {
    day: 3,
    nombre: { es: "Música en vivo", en: "Live music" },
    desc: {
      es: "Set acústico junto al jardín, ideal para cenar en pareja.",
      en: "Acoustic set by the garden, perfect for a dinner for two.",
    },
    horaInicio: "19:00",
    horaFin: "22:00",
    img: "img/ambiente/musica-vivo.jpg",
  },
  {
    day: 4,
    nombre: { es: "Noche de Jazz", en: "Jazz Night" },
    desc: {
      es: "Saxofonista en vivo entre platos de la cocina italiana.",
      en: "Live saxophone alongside our Italian kitchen favorites.",
    },
    horaInicio: "19:00",
    horaFin: "22:00",
    img: "img/ambiente/saxofonista.jpg",
  },
  {
    day: 5,
    nombre: { es: "DJ Set", en: "DJ Set" },
    desc: {
      es: "Arranca el fin de semana con ritmos tropicales y coctelería.",
      en: "Kick off the weekend with tropical rhythms and cocktails.",
    },
    horaInicio: "20:00",
    horaFin: "23:00",
    img: "img/ambiente/dj-noche.jpg",
  },
  {
    day: 6,
    nombre: { es: "Noche Especial: Música en vivo + DJ", en: "Special Night: Live Music + DJ" },
    desc: {
      es: "La noche más animada de la semana: banda en vivo seguida de DJ hasta cerrar.",
      en: "The liveliest night of the week: live band followed by a DJ until close.",
    },
    horaInicio: "19:00",
    horaFin: "23:00",
    img: "img/ambiente/bar-noche.jpg",
  },
];
