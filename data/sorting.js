// Preguntas del Sombrero Seleccionador. Cada respuesta suma un punto a su casa.
// Si hay empate, gana la casa empatada de la respuesta más reciente.

export const sorting = {
  title: "El Sombrero Seleccionador",
  intro: "El Sombrero te queda grande y huele a polvo. Respondé sin pensar demasiado: él ya está leyendo lo que no decís.",
  thinking: "Mmm... Veo mucho acá adentro. Dejame pensar.",
  result: "El Sombrero lo dice en voz alta para todo el comedor:",
  confirm: "Ir a mi mesa",
  questions: [
    {
      id: "pasillo-secreto",
      text: "Encontrás un pasillo que no figura en ningún plano. ¿Qué hacés?",
      answers: [
        { id: "entro", text: "Entro sin pensarlo dos veces.", house: "gryffindor" },
        { id: "busco-compania", text: "Busco a alguien para que venga conmigo.", house: "hufflepuff" },
        { id: "anoto", text: "Anoto todo lo que veo antes de avanzar.", house: "ravenclaw" },
        { id: "me-lo-guardo", text: "Me guardo el secreto hasta saber para qué me sirve.", house: "slytherin" },
      ],
    },
    {
      id: "examen",
      text: "Alguien se copia en un examen y nadie más lo vio. ¿Qué hacés?",
      answers: [
        { id: "se-lo-digo", text: "Se lo digo en la cara, aunque se enoje.", house: "gryffindor" },
        { id: "estudiamos", text: "Le ofrezco estudiar juntos para la próxima.", house: "hufflepuff" },
        { id: "examen-mejor", text: "Pienso cómo se haría un examen imposible de copiar.", house: "ravenclaw" },
        { id: "favor", text: "Me lo acuerdo, por si algún día necesito un favor.", house: "slytherin" },
      ],
    },
    {
      id: "recuerdo",
      text: "¿Qué te gustaría que dijeran de vos cuando te vayas del castillo?",
      answers: [
        { id: "sin-retroceder", text: "Que nunca dio un paso atrás.", house: "gryffindor" },
        { id: "se-podia-contar", text: "Que siempre se podía contar con esa persona.", house: "hufflepuff" },
        { id: "sabia-antes", text: "Que sabía la respuesta antes de que terminaran la pregunta.", house: "ravenclaw" },
        { id: "mas-lejos", text: "Que llegó más lejos que todos.", house: "slytherin" },
      ],
    },
    {
      id: "objeto",
      text: "Podés llevarte un solo objeto del castillo. ¿Cuál elegís?",
      answers: [
        { id: "escoba", text: "Una escoba que nadie se anima a montar.", house: "gryffindor" },
        { id: "olla", text: "Una olla que nunca se vacía.", house: "hufflepuff" },
        { id: "libro", text: "Un libro que responde cualquier pregunta.", house: "ravenclaw" },
        { id: "espejo", text: "Un espejo que muestra lo que va a pasar mañana.", house: "slytherin" },
      ],
    },
  ],
};

// answers es la lista de ids de casa en el orden en que se respondió.
export function sortIntoHouse(answers) {
  const scores = new Map();
  answers.forEach((houseId) => scores.set(houseId, (scores.get(houseId) || 0) + 1));
  const best = Math.max(...scores.values());
  return answers.findLast((houseId) => scores.get(houseId) === best);
}
