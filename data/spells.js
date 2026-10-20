// Hechizos que se aprenden con la varita. placeId es el lugar donde se usan.
// Los ids están repetidos en firestore.rules (validSpells): si cambian acá,
// cambian allá.
//
// gesture es el trazo que hay que dibujar en la escena para lanzarlo: los
// puntos (en un cuadrado de 100 x 100, con y hacia abajo) sirven de plantilla
// para el reconocedor y para dibujar la guía. once: el hechizo se lanza una
// vez por lugar (después la escena sigue con su juego); si es false se puede
// repetir cada cooldown segundos.

// Círculo de 16 lados que empieza arriba y gira en sentido horario.
const circle = Array.from({ length: 17 }, (_, index) => {
  const angle = ((index % 16) / 16) * Math.PI * 2 - Math.PI / 2;
  return [Math.round(50 + Math.cos(angle) * 50), Math.round(50 + Math.sin(angle) * 50)];
});

export const spells = [
  {
    id: "lumos",
    name: "Encantamiento de luz",
    incantation: "Lumos",
    description: "Enciende la punta de la varita. Sirve para leer lo que la oscuridad esconde.",
    placeId: "pasillo",
    gesture: {
      shape: "un triángulo, como una llama",
      points: [[0, 100], [50, 0], [100, 100], [0, 100]],
    },
    prompt: "Está todo oscuro. Dibujá Lumos en la escena: un triángulo, como una llama.",
    once: true,
  },
  {
    id: "alohomora",
    name: "Encantamiento de apertura",
    incantation: "Alohomora",
    description: "Abre cerraduras simples. No sirve con puertas que tienen dueño.",
    placeId: "escaleras",
    gesture: {
      shape: "un círculo, como quien gira una llave",
      points: circle,
    },
    prompt: "Las escaleras están trabadas. Dibujá Alohomora en la escena: un círculo, como quien gira una llave.",
    once: true,
  },
  {
    id: "accio",
    name: "Encantamiento convocador",
    incantation: "Accio",
    description: "Atrae un objeto hacia vos. Cuanto más rápido se mueve, más cuesta.",
    placeId: "quidditch",
    gesture: {
      shape: "una zeta, como un tirón",
      points: [[0, 0], [100, 0], [0, 100], [100, 100]],
    },
    prompt: "Si se te escapa, dibujá Accio (una zeta) y la snitch se acerca un momento.",
    once: false,
    cooldown: 6,
  },
];

export const SPELL_IDS = new Set(spells.map((spell) => spell.id));
