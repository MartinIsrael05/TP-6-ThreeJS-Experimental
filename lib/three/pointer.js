import * as THREE from "three";

// Puntero de una escena: coordenadas normalizadas (de -1 a 1), un raycaster
// listo y los toques (click o tap). Los listeners se registran con ctx.listen,
// así que se sacan solos al desmontar.
export function createPointer({ renderer, camera, listen }) {
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const state = { ndc, inside: false, moved: 0 };
  const tapHandlers = [];
  const moveHandlers = [];
  const downHandlers = [];
  const upHandlers = [];

  function read(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  listen(renderer.domElement, "pointermove", (event) => {
    read(event);
    state.inside = true;
    state.moved += 1;
    moveHandlers.forEach((handler) => handler(event));
  });
  listen(renderer.domElement, "pointerleave", () => {
    state.inside = false;
  });
  listen(renderer.domElement, "pointerdown", (event) => {
    read(event);
    downHandlers.forEach((handler) => handler(event));
  });
  listen(renderer.domElement, "pointerup", (event) => {
    read(event);
    upHandlers.forEach((handler) => handler(event));
  });
  listen(renderer.domElement, "click", (event) => {
    read(event);
    tapHandlers.forEach((handler) => handler(event));
  });

  return {
    state,
    ndc,
    // Lo que está debajo del puntero, de lo más cerca a lo más lejos.
    cast(objects, recursive = true) {
      raycaster.setFromCamera(ndc, camera);
      return raycaster.intersectObjects(Array.isArray(objects) ? objects : [objects], recursive);
    },
    ray() {
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray;
    },
    onTap(handler) {
      tapHandlers.push(handler);
    },
    onMove(handler) {
      moveHandlers.push(handler);
    },
    onDown(handler) {
      downHandlers.push(handler);
    },
    onUp(handler) {
      upHandlers.push(handler);
    },
    setCursor(value) {
      renderer.domElement.style.cursor = value;
    },
  };
}

// Suavizado exponencial independiente del frame rate.
export function damp(current, target, lambda, delta) {
  return THREE.MathUtils.damp(current, target, lambda, delta);
}

// Curva de aceleración suave en los dos extremos (0 a 1).
export function easeInOut(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}
