// Las cuatro casas. color se usa en bordes y brillos; accent es la versión
// clara, legible sobre el fondo oscuro. Los ids están repetidos en
// firestore.rules (validHouses): si cambian acá, cambian allá.

export const houses = [
  {
    id: "gryffindor",
    name: "Gryffindor",
    color: "#9b2226",
    accent: "#e9b44c",
    trait: "Vas primero aunque no sepas qué hay del otro lado.",
    ending: {
      title: "Entraste primero, como siempre.",
      copy: "No esperaste a nadie. Bajaste a la Cámara con la varita en alto y le hablaste a la puerta sin que te temblara la voz. El diario se cerró solo en tus manos y la tinta dejó de moverse.",
    },
  },
  {
    id: "hufflepuff",
    name: "Hufflepuff",
    color: "#c9971c",
    accent: "#f2d16b",
    trait: "Nadie se queda atrás si vos estás cerca.",
    ending: {
      title: "Nadie se quedó atrás.",
      copy: "Antes de bajar dejaste una nota en la mesa de tu casa para que supieran dónde buscarte. La puerta se abrió, el diario se cerró y volviste a tiempo para el desayuno.",
    },
  },
  {
    id: "ravenclaw",
    name: "Ravenclaw",
    color: "#2c5aa0",
    accent: "#b9cbe6",
    trait: "Preferís entender antes que ganar.",
    ending: {
      title: "Leíste el diario mejor que su dueño.",
      copy: "Las tres páginas tenían algo en común que nadie más vio. Lo resolviste antes de llegar a la puerta, y cuando el diario intentó escribirte, ya sabías cómo cerrarlo.",
    },
  },
  {
    id: "slytherin",
    name: "Slytherin",
    color: "#1f6b4f",
    accent: "#a9c9b4",
    trait: "Sabés lo que querés y no te da vergüenza decirlo.",
    ending: {
      title: "La puerta te reconoció.",
      copy: "Hablaste y las serpientes de piedra se corrieron como si te estuvieran esperando. El diario te ofreció un trato. Lo cerraste igual, y te quedaste con la llave.",
    },
  },
];

export const HOUSE_IDS = new Set(houses.map((house) => house.id));

export function getHouse(id) {
  return houses.find((house) => house.id === id);
}
