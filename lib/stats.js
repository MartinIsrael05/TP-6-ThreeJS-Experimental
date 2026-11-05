// Contador del recorrido: segundos en el castillo y hechizos lanzados. Se
// guarda solo en este navegador (no en Firestore, así no cambia el modelo de
// datos ni las reglas). También recuerda el día de la última visita, para el
// "Lo que pasó hasta ahora".

const KEY = "tp6-hogwarts-stats";
const EMPTY = { seconds: 0, spells: 0, lastDay: null };

function read() {
  try {
    return { ...EMPTY, ...JSON.parse(window.localStorage.getItem(KEY) || "null") };
  } catch {
    return { ...EMPTY };
  }
}

function write(stats) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Sin localStorage el contador no se guarda; el juego sigue igual.
  }
}

// Fecha local en formato AAAA-MM-DD.
const today = () => new Date().toLocaleDateString("sv");

export function readStats() {
  return read();
}

export function addSeconds(seconds) {
  const stats = read();
  stats.seconds += seconds;
  write(stats);
}

export function countSpell() {
  const stats = read();
  stats.spells += 1;
  write(stats);
}

export function resetStats() {
  write({ ...EMPTY, lastDay: today() });
}

// Marca la visita de hoy y devuelve si la anterior fue otro día.
export function markVisit() {
  const stats = read();
  const returning = Boolean(stats.lastDay) && stats.lastDay !== today();
  stats.lastDay = today();
  write(stats);
  return returning;
}
