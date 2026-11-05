// Pausa de las escenas 3D mientras algo las tapa casi por completo (el mapa,
// el resumen, el velo de tinta): no tiene sentido dibujar 60 cuadros por
// segundo que nadie ve. Cada pedido devuelve la función que lo suelta.

const reasons = new Set();

export function pauseScenes() {
  const token = Symbol("pausa");
  reasons.add(token);
  return () => reasons.delete(token);
}

export function scenesPaused() {
  return reasons.size > 0;
}
