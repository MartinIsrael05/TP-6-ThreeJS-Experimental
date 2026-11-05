// Detecta que alguien agita la varita: varios cambios de dirección
// horizontales, amplios y seguidos. Funciona con cualquier puntero (mouse,
// dedo o la mano con la cámara) y con el acelerómetro del celular.

const WINDOW_MS = 1100;
const MIN_SWING = 28; // píxeles mínimos de cada ida o vuelta
const REVERSALS = 4;
const COOLDOWN_MS = 1200;
// Aceleración (m/s², sin gravedad) que cuenta como sacudida del celular.
const MOTION_THRESHOLD = 16;

export function createShakeDetector({ onShake }) {
  let lastX = null;
  let direction = 0;
  let swing = 0;
  let reversals = [];
  let lastShake = -Infinity;

  function trigger(now) {
    if (now - lastShake < COOLDOWN_MS) return;
    lastShake = now;
    reversals = [];
    onShake();
  }

  return {
    // Cada movimiento del puntero, en píxeles de pantalla. Conviene pasar
    // event.timeStamp: es cuándo se movió, no cuándo se procesó el evento.
    feed(x, now = performance.now()) {
      if (lastX === null) {
        lastX = x;
        return;
      }
      const dx = x - lastX;
      lastX = x;
      if (dx === 0) return;
      const sign = Math.sign(dx);
      if (sign === direction) {
        swing += Math.abs(dx);
        return;
      }
      // Cambio de dirección: cuenta solo si la ida anterior fue amplia.
      if (direction !== 0 && swing >= MIN_SWING) reversals.push(now);
      direction = sign;
      swing = Math.abs(dx);
      reversals = reversals.filter((time) => now - time < WINDOW_MS);
      if (reversals.length >= REVERSALS) trigger(now);
    },
    // Lectura del acelerómetro (DeviceMotionEvent.acceleration).
    feedMotion(acceleration, now = performance.now()) {
      if (!acceleration) return;
      const { x = 0, y = 0, z = 0 } = acceleration;
      if (Math.hypot(x ?? 0, y ?? 0, z ?? 0) > MOTION_THRESHOLD) trigger(now);
    },
  };
}

// En iPhone (iOS 13 o más nuevo) el acelerómetro necesita permiso, y solo se
// puede pedir dentro de un toque del usuario: se llama al abrir una caja. En
// los demás navegadores no hace nada.
export function askMotionPermission() {
  const request = globalThis.DeviceMotionEvent?.requestPermission;
  if (typeof request !== "function") return;
  request.call(DeviceMotionEvent).catch(() => {
    // Sin permiso se agita igual con el dedo o el mouse.
  });
}
