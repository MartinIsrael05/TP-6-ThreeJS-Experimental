// Varitas de Ollivanders. Los ids están repetidos en firestore.rules
// (validWands): si cambian acá, cambian allá. trial es lo que pasa en la
// tienda cuando la probás: se apaga la vela, estalla el frasco, tiembla el
// estante o llueven chispas.

export const wandShop = {
  title: "Ollivanders",
  intro: "Cada caja que abrís hace algo distinto: una vela que se apaga, un frasco que se rompe, un estante que tiembla. Elegí la que te respondió mejor.",
  confirm: "Quedarme con esta varita",
  learned: "Con la varita llegan tus primeros hechizos. El diario te va a pedir cada uno en su lugar.",
  close: "Guardar la varita",
};

export const wands = [
  {
    id: "sauce-unicornio",
    trial: "vela",
    wood: "Sauce",
    core: "pelo de unicornio",
    lengthCm: 26,
    description: "Flexible y paciente. Mejora con la práctica más que con el talento.",
  },
  {
    id: "cerezo-dragon",
    trial: "frasco",
    wood: "Cerezo",
    core: "fibra de corazón de dragón",
    lengthCm: 29,
    description: "Rápida y temperamental. Responde fuerte cuando no dudás.",
  },
  {
    id: "nogal-fenix",
    trial: "estante",
    wood: "Nogal",
    core: "pluma de fénix",
    lengthCm: 31,
    description: "Rígida y precisa. Le gustan los hechizos difíciles.",
  },
  {
    id: "abedul-unicornio",
    trial: "chispas",
    wood: "Abedul",
    core: "pelo de unicornio",
    lengthCm: 24,
    description: "Liviana y fiel. Cuesta que cambie de dueño.",
  },
];

export const WAND_IDS = new Set(wands.map((wand) => wand.id));

export function getWand(id) {
  return wands.find((wand) => wand.id === id);
}

export function wandName(wand) {
  return `${wand.wood} y ${wand.core}, ${wand.lengthCm} cm`;
}
