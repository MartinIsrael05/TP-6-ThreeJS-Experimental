// Las tres páginas arrancadas del diario, para releerlas en /diario/[pagina].
// Cada una se lee cuando conseguiste su ítem en el castillo (itemId) y
// adelanta adónde ir después. Las escribe Riddle, hace cincuenta años.

export const diaryTexts = {
  read: "Leer la página",
  cardLabel: "Diario de Tom Riddle",
  eyebrow: (number, total) => `Página ${number} de ${total}`,
  foundIn: (label) => `La encontraste en ${label}.`,
  missingTitle: "Esta página todavía está arrancada.",
  missingCopy: (label) => `La tinta aparece cuando la recuperás en ${label}.`,
  hiddenEyebrow: "Una página que no estaba en el índice",
  hiddenTitle: "Esta página no figura en ningún índice.",
  hiddenCopy: "Alguien la escondió en el castillo. La tercera página da una pista.",
  goFind: (label) => `Buscarla en ${label}`,
  back: "Volver al castillo",
  previous: "Página anterior",
  next: "Página siguiente",
  signature: "T. R.",
};

export const diaryEntries = [
  {
    number: "1",
    itemId: "pagina-1",
    placeId: "escaleras",
    date: "Septiembre, hace cincuenta años",
    title: "Las escaleras me obedecen.",
    lines: [
      "Desde la primera noche supe que este castillo escucha. Las escaleras giran para todos, pero conmigo se detienen donde yo quiero.",
      "Si estás leyendo esto, ya diste el primer paso. El segundo piso guarda un mensaje que solo se lee con luz.",
      "No lo busques de día: de día la pared no dice nada.",
    ],
  },
  {
    number: "2",
    itemId: "pagina-2",
    placeId: "pasillo",
    date: "Febrero, hace cincuenta años",
    title: "Encontré lo que mi familia buscó durante siglos.",
    lines: [
      "Los demás les tienen miedo a las arañas. Yo las sigo: siempre se van hacia el mismo lado, como si algo las echara.",
      "La pared del segundo piso lo dice mejor que yo, y ya la leíste.",
      "Cuando el viento sople fuerte sobre el campo, mirá hacia arriba. Algo dorado guarda la última página.",
    ],
  },
  {
    number: "3",
    itemId: "pagina-3",
    placeId: "quidditch",
    date: "Junio, hace cincuenta años",
    title: "Nadie vigila el castillo de noche.",
    lines: [
      "Nadie, salvo el celador y su gata. Cruzá la Sala de trofeos sin que te vean y bajá por el baño clausurado. Mi nombre todavía brilla en una de sus vitrinas.",
      "La puerta te va a hablar en una lengua que todavía no sabés que entendés.",
      "Contestale. Te estuve esperando.",
    ],
  },
  {
    // Escondida: detrás del escudo con el nombre de Riddle en la Sala de
    // trofeos. No es un lugar del recorrido y cambia el final.
    number: "4",
    itemId: "pagina-4",
    placeId: "trofeos",
    hidden: true,
    date: "Junio, hace cincuenta años",
    title: "Lo que nadie sabe de mí.",
    lines: [
      "Me dieron un premio por servicios especiales al colegio. Lo gané con una mentira: dije que el monstruo ya no estaba.",
      "Este diario guarda mi recuerdo de esa noche. Mientras exista, puedo volver.",
      "Un diario como este no se cierra. Se destruye. Pero eso no te lo voy a explicar.",
    ],
  },
];

export function getDiaryEntry(number) {
  return diaryEntries.find((entry) => entry.number === number);
}

export function getDiaryEntryByItem(itemId) {
  return diaryEntries.find((entry) => entry.itemId === itemId);
}
