// Mapa del Merodeador: textos y dónde cae cada lugar sobre el pergamino.
// Las coordenadas son del dibujo (viewBox de 1000 x 640). start es el
// muelle del lago, donde empieza el recorrido antes del primer lugar.

export const MAP_SIZE = { width: 1000, height: 640 };

export const mapTexts = {
  open: "Mapa",
  title: "Mapa del Merodeador",
  subtitle: "Los señores Lunático, Colagusano, Canuto y Cornamenta se enorgullecen en presentar",
  oath: "Juro solemnemente que mis intenciones no son buenas",
  close: "Travesura realizada",
  skip: "Saltar el camino",
  you: "Vos",
  startLabel: "Lago Negro",
  locked: "Todavía en blanco",
  travelling: (label) => `Tus pasos van hacia ${label}`,
  arrived: (label) => `Llegaste a ${label}`,
  enter: (label) => `Entrar a ${label}`,
  here: (label) => `Estás en ${label}`,
  start: "Todavía estás en el bote",
};

export const mapStart = { x: 150, y: 560 };

// bend curva el tramo que llega a ese lugar (positivo o negativo según el lado).
export const mapPlaces = {
  "gran-comedor": { x: 360, y: 405, bend: 0.18 },
  ollivanders: { x: 175, y: 165, bend: -0.2, memory: "Callejón Diagon, un recuerdo" },
  escaleras: { x: 520, y: 285, bend: 0.12 },
  pasillo: { x: 690, y: 190, bend: -0.15 },
  quidditch: { x: 880, y: 470, bend: 0.2 },
  trofeos: { x: 680, y: 390, bend: 0.15 },
  camara: { x: 520, y: 565, bend: -0.12, below: "Debajo del castillo" },
};

// Otros nombres que se mueven por el mapa. path es una lista de puntos que
// recorren en loop; seconds, cuánto tardan en dar la vuelta.
export const mapWanderers = [
  {
    id: "filch",
    name: "Argus Filch",
    seconds: 18,
    path: [[590, 338], [770, 328], [786, 346], [604, 354]],
  },
  {
    id: "norris",
    name: "Señora Norris",
    seconds: 13,
    path: [[760, 452], [610, 446], [596, 462], [750, 468]],
  },
  {
    id: "peeves",
    name: "Peeves",
    seconds: 9,
    path: [[470, 250], [580, 230], [600, 320], [480, 330]],
  },
  {
    id: "riddle",
    name: "Tom Riddle",
    seconds: 20,
    ghost: true,
    path: [[440, 560], [520, 515], [610, 560], [520, 612]],
  },
];
