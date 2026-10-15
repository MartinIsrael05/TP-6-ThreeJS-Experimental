// Hechizos que se aprenden con la varita. placeId es el lugar donde se usan.
// Los ids están repetidos en firestore.rules (validSpells): si cambian acá,
// cambian allá.

export const spells = [
  {
    id: "lumos",
    name: "Encantamiento de luz",
    incantation: "Lumos",
    description: "Enciende la punta de la varita. Sirve para leer lo que la oscuridad esconde.",
    placeId: "pasillo",
  },
  {
    id: "alohomora",
    name: "Encantamiento de apertura",
    incantation: "Alohomora",
    description: "Abre cerraduras simples. No sirve con puertas que tienen dueño.",
    placeId: "escaleras",
  },
  {
    id: "accio",
    name: "Encantamiento convocador",
    incantation: "Accio",
    description: "Atrae un objeto hacia vos. Cuanto más rápido se mueve, más cuesta.",
    placeId: "quidditch",
  },
];

export const SPELL_IDS = new Set(spells.map((spell) => spell.id));
