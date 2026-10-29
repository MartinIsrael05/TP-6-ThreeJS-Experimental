// Transición entre lugares. El velo (components/PlaceVeil.js) vive en el
// layout, que no se desmonta al cambiar de ruta, así que la transición
// sobrevive a la navegación:
//
//   closing  el velo de tinta tapa la pantalla y aparece el cartel del lugar
//   covered  ya se navegó; se espera a que la escena nueva dibuje su primer
//            cuadro (markSceneReady) o a que pase FALLBACK_MS
//   opening  el velo se levanta y deja ver la escena
//
// Es un store mínimo para useSyncExternalStore.

const CLOSE_MS = 750;
const MIN_TITLE_MS = 1500;
const OPEN_MS = 1200;
const FALLBACK_MS = 3500;
const REDUCED = { close: 120, title: 400, open: 200 };

const IDLE = Object.freeze({ phase: "idle", card: null, id: 0 });
let state = IDLE;
const listeners = new Set();
let timers = [];

function set(next) {
  state = next;
  listeners.forEach((listener) => listener());
}

function later(fn, ms) {
  timers.push(window.setTimeout(fn, ms));
}

function clearTimers() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
}

function durations() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? REDUCED : { close: CLOSE_MS, title: MIN_TITLE_MS, open: OPEN_MS };
}

export function subscribeTransition(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getTransition = () => state;
export const getServerTransition = () => IDLE;

// card: { number, label, eyebrow, color } que se muestra en el velo.
// navigate se llama cuando el velo ya tapa todo.
export function beginTransition(card, navigate) {
  if (state.phase === "closing") return;
  clearTimers();
  const id = state.id + 1;
  const times = durations();
  const startedAt = performance.now();
  set({ phase: "closing", card, id, ready: false, startedAt, times });
  later(() => {
    set({ ...state, phase: "covered" });
    navigate();
    later(() => openIfCovered(id), FALLBACK_MS);
  }, times.close);
}

function openIfCovered(id) {
  if (state.id !== id || state.phase !== "covered" || state.ready) return;
  state = { ...state, ready: true };
  const { times } = state;
  // El cartel queda por lo menos MIN_TITLE_MS, aunque la escena llegue antes.
  const wait = Math.max(0, times.close + times.title - (performance.now() - state.startedAt));
  later(() => {
    if (state.id !== id) return;
    set({ ...state, phase: "opening" });
    later(() => {
      if (state.id === id) set({ ...IDLE, id });
    }, times.open);
  }, wait);
}

// Lo llaman las escenas al dibujar su primer cuadro, y las páginas sin
// escena al montarse.
export function markSceneReady() {
  if (state.phase === "covered") openIfCovered(state.id);
}
