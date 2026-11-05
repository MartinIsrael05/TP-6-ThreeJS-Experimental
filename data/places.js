// Contenido narrativo del recorrido. Los textos son provisorios (Fase 1).
// Cada lugar tiene un ítem coleccionable: conseguirlo desbloquea el siguiente.
// action (opcional) es el texto del botón alternativo a la escena 3D: abre un
// diálogo (Sombrero, varitas) o resuelve el lugar. Si falta, el botón lanza
// el hechizo de data/spells.js que se usa en ese lugar. Los ids de lugares e
// ítems están repetidos en firestore.rules (validPlaces, validItems): si
// cambian acá, cambian allá.

export const siteName = "Las páginas del diario";

// El prólogo se recorre con scroll: el bote cruza el lago mientras aparecen
// los textos de beats, uno por tramo.
export const prologue = {
  title: "Las páginas del diario",
  hint: "Deslizá para cruzar el lago",
  skip: "Saltar la llegada",
  beats: [
    "Los botes salen solos de la orilla. Nadie rema, nadie habla. Del otro lado del lago, el castillo te mira con todas sus ventanas.",
    "Recién llegaste a Hogwarts y ya encontraste algo que no tendrías que tener: el diario de Tom Riddle, con tres páginas arrancadas.",
    "Seguilas por el castillo y llegá a la Cámara de los Secretos antes de que vuelva a abrirse.",
  ],
  cta: "Abrir el diario",
  resume: (label) => `Seguir en ${label}`,
  note: "Mejor con auriculares y la luz baja.",
  // Cartel de la transición al volver a la portada.
  returnCard: { label: "Lago Negro", eyebrow: "De vuelta en el bote", color: "#4a6fa5" },
};

// Lugar al que se llegó por la URL antes de que el diario lo revelara.
export const lockedPlace = {
  eyebrow: "Página en blanco",
  title: "Este lugar todavía no aparece en tu mapa.",
  copy: (missing) => `El diario revela cada lugar cuando conseguís lo que esconde el anterior. Antes tenés que pasar por ${missing}.`,
  back: (label) => `Ir a ${label}`,
  map: "Abrir el mapa",
};

// Textos del panel de pársel en la Cámara. status va por estado del juego.
export const parsel = {
  title: "Pársel",
  status: {
    wait: "La puerta está por hablar.",
    play: "La puerta sisea. Prestá atención a cuánto dura cada siseo.",
    input: "Tu turno: siseá «sssss», corto o largo, en el mismo orden.",
    wrong: "La puerta no te entendió. Escuchala de nuevo.",
  },
  mic: "Sisear al micrófono",
  micError: "Sin micrófono: usá el botón",
  hold: "Mantené para sisear",
  replay: "Volver a escuchar",
};

// Textos del panel de la capa en la Sala de trofeos. status va por estado
// del juego (lo cuenta la escena).
export const cloak = {
  title: "Capa de invisibilidad",
  start: "Empezar a cruzar",
  status: {
    ready: "Filch está de espaldas. Cuando empieces, vas a caminar solo.",
    away: "Filch está de espaldas. Avanzá en puntas de pie.",
    turning: "¡Filch se da vuelta! Cubrite con la capa.",
    looking: "La linterna barre la sala. Quedate bajo la capa.",
    caught: "Señora Norris te vio. Volvés a la última armadura.",
    done: "Llegaste al otro lado sin que te vieran.",
  },
  covered: "Bajo la capa",
  uncovered: "A la vista",
  camera: "Cubrirme con las manos",
  cameraOn: "Tapate la cara con las dos manos",
  cameraHands: (count) => (count === 2 ? "Veo tus dos manos" : count === 1 ? "Veo una mano" : "No veo tus manos"),
  cameraError: "Sin cámara: usá el botón",
  hold: "Mantené para cubrirte",
  distance: "Distancia hasta la puerta",
};

export const ending = {
  eyebrow: "Final sin casa",
  title: "Cerraste el diario antes que él.",
  copy: "Las tres páginas volvieron a su lugar y la tinta dejó de moverse. Llegaste hasta acá sin que el Sombrero te eligiera: tu casa todavía te espera en el Gran Comedor.",
};

// Final si además encontraste la cuarta página escondida: le gana al de la
// casa (el color sigue siendo el de tu casa).
export const secretEnding = {
  eyebrow: (houseName) => (houseName ? `Final verdadero de ${houseName}` : "Final verdadero"),
  title: "No cerraste el diario: lo destruiste.",
  copy: "La cuarta página te lo había dicho: un diario así no se cierra, se destruye. Lo atravesaste con un colmillo que encontraste en la Cámara y la tinta salió negra como la noche. Ya no va a volver a escribirle a nadie.",
};

// Cuarta página: no es un lugar del recorrido. Está escondida en la Sala de
// trofeos y cambia el final. Su id también está en firestore.rules.
export const secretItem = { id: "pagina-4", type: "pagina", label: "Cuarta página del diario", placeId: "trofeos" };

// Nota del diario que se abre al llegar a cada lugar, antes de la escena.
export const storyNote = {
  eyebrow: (number, total) => `Diario de T. M. Riddle · Capítulo ${Number(number)} de ${total}`,
  goal: "Lo que tenés que hacer",
  close: "Cerrar el diario y empezar",
};

// Pistas: el diario las escribe solo si tardás. after es en segundos.
export const hintTexts = {
  prefix: "El diario escribe:",
  after: [45, 90, 140],
  secretFound: "Encontraste una cuarta página escondida. El final ya no va a ser el mismo.",
};

// "Lo que pasó hasta ahora": aparece al volver al sitio otro día.
export const recapTexts = {
  eyebrow: "Volviste al castillo",
  title: "Lo que pasó hasta ahora",
  house: (name) => `El Sombrero te mandó a ${name}.`,
  noHouse: "El Sombrero todavía no te eligió casa.",
  wand: (name) => `Tu varita: ${name}.`,
  pages: (count, secret) => `Recuperaste ${count} de 3 páginas del diario${secret ? ", y una cuarta que nadie sabía que existía" : ""}.`,
  where: (label) => `La última vez estabas en ${label}.`,
  next: (label) => `Lo que sigue: ${label}.`,
  done: "Ya abriste la Cámara. Podés volver a cualquier lugar desde el mapa.",
  close: "Seguir",
};

// Contador del recorrido, en el final.
export const statsTexts = {
  title: "Tu recorrido",
  time: "Tiempo en el castillo",
  spells: "Hechizos lanzados",
  pages: "Páginas del diario",
  formatTime: (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes ? `${minutes} min ${rest} s` : `${rest} s`;
  },
};

// Cómo se nombra cada tipo de ítem en la tarjeta del lugar.
export const itemTypeLabels = {
  decision: "Una decisión",
  pagina: "Una página arrancada",
  sigilo: "Un paso a escondidas",
  final: "El cierre",
};

// Estado de persistencia contado dentro del mundo. hint es la versión llana
// para lectores de pantalla y el tooltip.
export const persistenceLabels = {
  cloud: { label: "LECHUZA ENVIADA", hint: "Tu progreso se guarda en la nube" },
  local: { label: "PERGAMINO LOCAL", hint: "Tu progreso se guarda solo en este navegador" },
  offline: { label: "SIN LECHUZAS", hint: "Sin conexión: tu progreso se guarda en este navegador" },
};

export const places = [
  {
    id: "gran-comedor",
    number: "01",
    label: "Gran Comedor",
    eyebrow: "Primera noche en el castillo",
    title: "El Sombrero todavía no dijo tu nombre.",
    copy: "Cuatro mesas largas, velas que flotan sin hilo y un techo que copia el cielo de afuera. Entre los platos alguien dejó un cuaderno negro sin dueño. Antes de abrirlo, el Sombrero tiene que decidir dónde vas a dormir.",
    instruction: "Ponete el Sombrero y respondé lo que te pregunte.",
    action: "Ponerme el Sombrero",
    color: "#c9a227",
    accent: "#f1d58a",
    note: {
      title: "Un cuaderno sin dueño",
      text: "Esta noche llegaste a Hogwarts. Entre los platos del Gran Comedor encontraste un cuaderno negro con un nombre gastado en la tapa: T. M. Riddle. Cuando lo abriste, la tinta escribió sola: «Me faltan tres páginas. Encontralas antes de que la Cámara se abra otra vez». Pero primero, el Sombrero tiene que decidir a qué casa pertenecés.",
    },
    hints: [
      "Tocá el Sombrero o usá el botón «Ponerme el Sombrero».",
      "No hay respuestas malas: elegí el pergamino que más se parezca a vos.",
    ],
    item: { id: "sombrero", type: "decision", label: "Tu casa quedó elegida" },
  },
  {
    id: "ollivanders",
    number: "02",
    label: "Ollivanders",
    eyebrow: "Un recuerdo guardado en el diario",
    title: "Ninguna caja se abre hasta que la varita te reconoce.",
    copy: "El diario se entibia en tus manos y te muestra un recuerdo: una tienda angosta, miles de cajas apiladas hasta el techo y un polvo que brilla con la luz. Una de esas varitas te está esperando desde antes de que nacieras.",
    instruction: "Tocá una caja de los estantes y probá varitas hasta que una te responda. Después practicá los tres hechizos.",
    action: "Probar varitas",
    color: "#a9742f",
    accent: "#e7b872",
    note: {
      title: "Un recuerdo prestado",
      text: "El diario te muestra un recuerdo que no es tuyo: la tienda de Ollivanders, el verano antes de tu primer año. Para seguir las páginas vas a necesitar una varita propia y practicar los tres hechizos que el diario te va a pedir por el camino.",
    },
    hints: [
      "Tocá una caja de los estantes y después agitá la varita: sacudí el mouse o el teléfono.",
      "Si una varita no te responde, abrí otra caja. Una sola te va a elegir.",
      "Para practicar, dibujá la forma que muestra el panel sobre la escena, de un solo trazo.",
    ],
    item: { id: "varita", type: "decision", label: "La varita ya es tuya" },
  },
  {
    id: "escaleras",
    number: "03",
    label: "Escaleras giratorias",
    eyebrow: "Torre central, después del toque de queda",
    title: "Las escaleras cambian de idea cuando quieren.",
    copy: "La primera página arrancada está en un descanso al que ninguna escalera llega. Los tramos giran con un ruido de piedra contra piedra. Si los alineás en el orden justo, el camino se arma solo.",
    instruction: "Arrastrá cada tramo para girarlo (o tocalo para girarlo un cuarto) hasta que el camino suba sin cortes. La runa de cada tramo se pone verde cuando quedó bien. Ojo: las escaleras cambian de idea una vez.",
    color: "#4a6fa5",
    accent: "#a9c1e6",
    note: {
      title: "La primera página",
      text: "Ya tenés casa y varita. La tinta se movió otra vez: la primera página está en la torre central, en un descanso al que ninguna escalera llega. Las escaleras cambian de idea seguido, así que vas a tener que acomodarlas más de una vez.",
    },
    hints: [
      "Primero dibujá un círculo sobre la escena para soltar las escaleras (Alohomora).",
      "Tocá cada tramo para girarlo un cuarto. La runa se pone verde cuando quedó bien.",
      "En la segunda vuelta un tramo se mueve solo: acomodá ese último.",
    ],
    // Mensajes que la escena muestra al cambiar de fase.
    status: {
      round2: "¡Las escaleras cambiaron de idea! Acomodalas otra vez.",
      restless: "Un tramo se movió solo. Las escaleras no se quedan quietas.",
    },
    item: { id: "pagina-1", type: "pagina", label: "Primera página del diario" },
  },
  {
    id: "pasillo",
    number: "04",
    label: "Pasillo del segundo piso",
    eyebrow: "Segundo piso, cerca del baño clausurado",
    title: "Hay un mensaje en la pared que solo se lee con luz.",
    copy: "El pasillo está inundado y huele a humedad. La segunda página habla de algo escrito en la piedra, pero en esta oscuridad no se ve nada. Las arañas se van todas para el mismo lado.",
    instruction: "Pasá la luz de la varita por la pared hasta leer todo lo que está escrito. Hay dos mensajes.",
    secret: ["La Cámara se abrió otra vez.", "El heredero ya camina entre nosotros."],
    // Segundo mensaje, más abajo: aparece cuando terminás de leer el primero.
    secretMore: ["Enemigos del heredero, temed.", "Seguí a las arañas."],
    color: "#9fc6d8",
    accent: "#ece2cd",
    note: {
      title: "Un mensaje en la piedra",
      text: "La primera página hablaba de un mensaje en el segundo piso que solo se lee con luz. El pasillo está inundado y oscuro, y las arañas huyen todas hacia la misma grieta. Alguien escribió en la pared algo que los profesores todavía no vieron.",
    },
    hints: [
      "Dibujá un triángulo sobre la escena para encender la varita (Lumos).",
      "Pasá la luz despacio por la pared, renglón por renglón.",
      "Cuando termines el primer mensaje, mirá más abajo: hay algo más escrito.",
    ],
    status: {
      more: "Hay algo más escrito, más abajo. Seguí con la luz.",
    },
    item: { id: "pagina-2", type: "pagina", label: "Segunda página del diario" },
  },
  {
    id: "quidditch",
    number: "05",
    label: "Campo de Quidditch",
    eyebrow: "Las tribunas, con niebla baja",
    title: "La tercera página está atada a una snitch.",
    copy: "El campo está vacío y los aros apenas se recortan contra el cielo. Algo dorado zumba entre las tribunas: una snitch con un papel doblado entre las alas. No va a esperar a que te decidas.",
    instruction: "Seguí el brillo y tocá la snitch para atraparla. Cada vez que fallás se escapa, pero se va cansando. Se suelta una vez: atrapala dos veces.",
    color: "#5c7a46",
    accent: "#d9c36a",
    note: {
      title: "Algo dorado entre las tribunas",
      text: "La segunda página te mandó al campo de Quidditch. La tercera está atada a una snitch que no quiere que la atrapen: si fallás, se escapa, pero cada vuelta la cansa un poco más. Y cuando creas que la tenés, puede que se suelte.",
    },
    hints: [
      "Dibujá una zeta (Accio) y la snitch se va a acercar unos segundos.",
      "No la persigas con el puntero: esperala donde va a pasar y tocala.",
    ],
    status: {
      escaped: "¡Se soltó! Ahora vuela más rápido. Atrapala otra vez.",
    },
    item: { id: "pagina-3", type: "pagina", label: "Tercera página del diario" },
  },
  {
    id: "trofeos",
    number: "06",
    label: "Sala de trofeos",
    eyebrow: "Tercer piso, pasada la medianoche",
    title: "Filch hace la ronda y Señora Norris no duerme nunca.",
    copy: "Con las tres páginas, el diario marca el camino al baño clausurado, pero antes hay que cruzar la Sala de trofeos. Esta noche apareció sobre tu cama una capa plateada con una nota: «Usala bien». Cuando la linterna de Filch gire hacia vos, desaparecé.",
    instruction: "Caminás solo. Cuando Filch se dé vuelta, cubrite con la capa: tapate la cara con las dos manos frente a la cámara, o mantené apretada la barra espaciadora o el botón.",
    action: "Pasar bajo la capa",
    color: "#8a94a6",
    accent: "#d6dde8",
    note: {
      title: "La ronda de Filch",
      text: "Con las tres páginas, el diario marcó el camino al baño clausurado del segundo piso. Pero antes hay que cruzar la Sala de trofeos después de medianoche, y Filch hace la ronda con su gata. Esta noche apareció sobre tu cama una capa plateada con una nota: «Usala bien».",
    },
    hints: [
      "Mantené apretada la barra espaciadora (o el botón) para cubrirte cuando Filch se da vuelta.",
      "Filch a veces amaga y vuelve a darse vuelta. No te descubras apenas gira.",
      "Hay un nombre que conozco grabado en una de estas vitrinas. Buscá el escudo que brilla.",
    ],
    status: {
      feint: "Filch amagó. Quedate quieto un momento más.",
    },
    item: { id: "capa", type: "sigilo", label: "Cruzaste sin que te vieran" },
  },
  {
    id: "camara",
    number: "07",
    label: "Cámara de los Secretos",
    eyebrow: "Debajo del castillo",
    title: "La puerta solo se abre si le hablás como a una serpiente.",
    copy: "Con las tres páginas juntas, el diario dibuja un camino que baja más allá de las mazmorras. Al final hay una puerta redonda con serpientes talladas. Si entrás antes que él, el diario se cierra para siempre.",
    instruction: "La puerta sisea un patrón de siseos cortos y largos. Repetilo siseando de verdad: «sssss» al micrófono, o manteniendo apretada la barra espaciadora.",
    action: "Hablar en pársel",
    color: "#1f6b4f",
    accent: "#7fd4a8",
    note: {
      title: "La Cámara de los Secretos",
      text: "El baño clausurado te llevó debajo del castillo. Al final del túnel hay una puerta redonda con serpientes talladas que solo se abre si le hablás en pársel. Si la abrís antes que él, el diario se cierra para siempre.",
    },
    hints: [
      "Escuchá cuánto dura cada siseo: hay cortos y largos.",
      "Si no tenés micrófono, mantené apretada la barra espaciadora para sisear.",
    ],
    item: { id: "camara-abierta", type: "final", label: "La Cámara está abierta" },
  },
];

export const firstPlace = places[0];

export const ITEM_IDS = new Set([...places.map((place) => place.item.id), secretItem.id]);

export const PLACE_IDS = new Set(places.map((place) => place.id));

export function getPlace(id) {
  return places.find((place) => place.id === id);
}
