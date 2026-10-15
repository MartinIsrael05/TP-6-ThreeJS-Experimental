// Contenido narrativo del recorrido. Los textos son provisorios (Fase 1).
// Cada lugar tiene un ítem coleccionable: conseguirlo desbloquea el siguiente.

export const siteName = "Las páginas del diario";

export const prologue = {
  title: "Las páginas del diario",
  copy: "Recién llegaste a Hogwarts y ya encontraste algo que no tendrías que tener: el diario de Tom Riddle, con tres páginas arrancadas. Seguilas por el castillo y llegá a la Cámara de los Secretos antes de que vuelva a abrirse.",
  cta: "Abrir el diario",
  note: "Mejor con auriculares y la luz baja.",
};

export const ending = {
  eyebrow: "Final provisorio",
  title: "Cerraste el diario antes que él.",
  copy: "Las tres páginas volvieron a su lugar y la tinta dejó de moverse. Fin del prototipo: más adelante, este final va a depender de tu casa.",
};

export const places = [
  {
    id: "gran-comedor",
    number: "01",
    label: "Gran Comedor",
    eyebrow: "Primera noche en el castillo",
    title: "El Sombrero todavía no dijo tu nombre.",
    copy: "Cuatro mesas largas, velas que flotan sin hilo y un techo que copia el cielo de afuera. Entre los platos alguien dejó un cuaderno negro sin dueño. Antes de abrirlo, el Sombrero tiene que decidir dónde vas a dormir.",
    instruction: "Tocá el Sombrero para que elija tu casa.",
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
    instruction: "Tocá las cajas hasta que una varita responda.",
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
    instruction: "Girá los tramos hasta que el camino quede alineado.",
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
    instruction: "Levantá la varita y decí Lumos para iluminar la pared.",
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
    instruction: "Seguí el brillo y atrapá la snitch.",
    color: "#5c7a46",
    accent: "#d9c36a",
    item: { id: "pagina-3", type: "pagina", label: "Tercera página del diario" },
  },
  {
    id: "camara",
    number: "06",
    label: "Cámara de los Secretos",
    eyebrow: "Debajo del castillo",
    title: "La puerta solo se abre si le hablás como a una serpiente.",
    copy: "Con las tres páginas juntas, el diario dibuja un camino que baja más allá de las mazmorras. Al final hay una puerta redonda con serpientes talladas. Si entrás antes que él, el diario se cierra para siempre.",
    instruction: "Hablá en pársel para que la puerta se abra.",
    color: "#1f6b4f",
    accent: "#7fd4a8",
    item: { id: "camara-abierta", type: "final", label: "La Cámara está abierta" },
  },
];

export const firstPlace = places[0];

export const ITEM_IDS = new Set(places.map((place) => place.item.id));

export function getPlace(id) {
  return places.find((place) => place.id === id);
}
