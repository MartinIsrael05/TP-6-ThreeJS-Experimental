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
    item: { id: "sombrero", type: "decision", label: "Tu casa quedó elegida" },
  },
  {
    id: "ollivanders",
    number: "02",
    label: "Ollivanders",
    eyebrow: "Un recuerdo guardado en el diario",
    title: "Ninguna caja se abre hasta que la varita te reconoce.",
    copy: "El diario se entibia en tus manos y te muestra un recuerdo: una tienda angosta, miles de cajas apiladas hasta el techo y un polvo que brilla con la luz. Una de esas varitas te está esperando desde antes de que nacieras.",
    instruction: "Tocá una caja de los estantes y probá varitas hasta que una te responda.",
    action: "Probar varitas",
    color: "#a9742f",
    accent: "#e7b872",
    item: { id: "varita", type: "decision", label: "La varita ya es tuya" },
  },
  {
    id: "escaleras",
    number: "03",
    label: "Escaleras giratorias",
    eyebrow: "Torre central, después del toque de queda",
    title: "Las escaleras cambian de idea cuando quieren.",
    copy: "La primera página arrancada está en un descanso al que ninguna escalera llega. Los tramos giran con un ruido de piedra contra piedra. Si los alineás en el orden justo, el camino se arma solo.",
    instruction: "Arrastrá cada tramo para girarlo (o tocalo para girarlo un cuarto) hasta que el camino suba sin cortes. La runa de cada tramo se pone verde cuando quedó bien.",
    color: "#4a6fa5",
    accent: "#a9c1e6",
    item: { id: "pagina-1", type: "pagina", label: "Primera página del diario" },
  },
  {
    id: "pasillo",
    number: "04",
    label: "Pasillo del segundo piso",
    eyebrow: "Segundo piso, cerca del baño clausurado",
    title: "Hay un mensaje en la pared que solo se lee con luz.",
    copy: "El pasillo está inundado y huele a humedad. La segunda página habla de algo escrito en la piedra, pero en esta oscuridad no se ve nada. Las arañas se van todas para el mismo lado.",
    instruction: "Pasá la luz de la varita por la pared hasta leer todo el mensaje.",
    secret: ["La Cámara se abrió otra vez.", "El heredero ya camina entre nosotros."],
    color: "#9fc6d8",
    accent: "#ece2cd",
    item: { id: "pagina-2", type: "pagina", label: "Segunda página del diario" },
  },
  {
    id: "quidditch",
    number: "05",
    label: "Campo de Quidditch",
    eyebrow: "Las tribunas, con niebla baja",
    title: "La tercera página está atada a una snitch.",
    copy: "El campo está vacío y los aros apenas se recortan contra el cielo. Algo dorado zumba entre las tribunas: una snitch con un papel doblado entre las alas. No va a esperar a que te decidas.",
    instruction: "Seguí el brillo y tocá la snitch para atraparla. Cada vez que fallás se escapa, pero se va cansando.",
    color: "#5c7a46",
    accent: "#d9c36a",
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
    item: { id: "camara-abierta", type: "final", label: "La Cámara está abierta" },
  },
];

export const firstPlace = places[0];

export const ITEM_IDS = new Set(places.map((place) => place.item.id));

export const PLACE_IDS = new Set(places.map((place) => place.id));

export function getPlace(id) {
  return places.find((place) => place.id === id);
}
