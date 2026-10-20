import * as THREE from "three";

// Castillo procedural sobre un acantilado: torres (cilindros con techo en
// punta), cuerpos (cajas) y cientos de ventanas encendidas. De lejos y de
// noche alcanza con la silueta y las luces.

export const CASTLE_POSITION = new THREE.Vector3(0, 0, -72);

// [x, z, ancho, alto, profundidad] de cada cuerpo, sobre la meseta.
const KEEPS = [
  [0, 0, 16, 7, 6],
  [-8, -3, 5, 15, 5],
  [7, -4, 6, 10, 5],
  [-14, 2, 6, 6, 4],
  [14, 1, 5, 8, 4],
];
// [x, z, radio, alto] de cada torre.
const TOWERS = [
  [10, 2, 1.4, 14],
  [-4, 3, 1.1, 11],
  [4, -2, 1.2, 17],
  [-12, 1, 1, 10],
  [16, -1, 0.9, 12],
  [-1, -6, 1.6, 22],
  [-17, -1, 0.9, 9],
  [-8.5, 1, 0.8, 19],
];
const PLATEAU = 10;
const WINDOW_COLOR = new THREE.Color(2.4, 1.35, 0.45); // pasa de 1: brilla con bloom

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCastle() {
  const random = seededRandom(23);
  const group = new THREE.Group();
  group.position.copy(CASTLE_POSITION);

  // Acantilado: rocas facetadas que salen del agua.
  const rock = new THREE.MeshStandardMaterial({ color: "#1b1f2a", roughness: 1, flatShading: true });
  [
    [0, 3, 0, 24, 11, 15],
    [-14, 1, 5, 11, 7, 9],
    [15, 0.5, 4, 12, 6, 10],
    [5, 1, 8, 9, 4, 6],
  ].forEach(([x, y, z, sx, sy, sz]) => {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1), rock);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = random() * Math.PI;
    group.add(mesh);
  });

  const stone = new THREE.MeshStandardMaterial({ color: "#2b2f3b", roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: "#151925", roughness: 0.8 });
  const windows = [];

  KEEPS.forEach(([x, z, width, height, depth]) => {
    const keep = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), stone);
    keep.position.set(x, PLATEAU + height / 2, z);
    group.add(keep);
    // Ventanas en la cara que mira al lago, en filas y columnas.
    for (let row = 1.2; row < height - 0.8; row += 1.6) {
      for (let column = -width / 2 + 0.8; column < width / 2 - 0.5; column += 1.1) {
        if (random() < 0.45) continue;
        windows.push(new THREE.Vector3(x + column, PLATEAU + row, z + depth / 2 + 0.02));
      }
    }
  });

  TOWERS.forEach(([x, z, radius, height]) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 16), stone);
    tower.position.set(x, PLATEAU + height / 2, z);
    group.add(tower);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.35, radius * 3.4, 16), roof);
    cone.position.set(x, PLATEAU + height + radius * 1.7, z);
    group.add(cone);
    for (let row = 2; row < height - 0.6; row += 1.8) {
      if (random() < 0.4) continue;
      const angle = (random() - 0.5) * 1.2;
      windows.push(new THREE.Vector3(x + Math.sin(angle) * (radius + 0.02), PLATEAU + row, z + Math.cos(angle) * (radius + 0.02)));
    }
  });

  // Todas las ventanas en un solo InstancedMesh.
  const windowMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.38, 0.62),
    new THREE.MeshBasicMaterial({ color: "#ffffff" }),
    windows.length,
  );
  const dummy = new THREE.Object3D();
  const colors = windows.map(() => WINDOW_COLOR.clone().multiplyScalar(0.55 + random() * 0.6));
  windows.forEach((position, index) => {
    dummy.position.copy(position);
    dummy.updateMatrix();
    windowMesh.setMatrixAt(index, dummy.matrix);
    windowMesh.setColorAt(index, colors[index]);
  });
  group.add(windowMesh);

  // Las ventanas se encienden de a poco con el avance (lit de 0 a 1), y
  // algunas titilan como velas.
  const order = windows.map((_, index) => ({ index, at: random() * 0.85 }));
  const shown = new THREE.Color();
  let lastLit = -1;
  let clock = 0;

  return {
    group,
    windowCount: windows.length,
    update(lit, delta) {
      clock += delta;
      if (Math.abs(lit - lastLit) < 0.002 && clock < 0.15) return;
      clock = 0;
      lastLit = lit;
      order.forEach(({ index, at }) => {
        const on = THREE.MathUtils.smoothstep(lit, at, at + 0.12);
        const flicker = 0.85 + Math.random() * 0.15;
        windowMesh.setColorAt(index, shown.copy(colors[index]).multiplyScalar(on * flicker));
      });
      windowMesh.instanceColor.needsUpdate = true;
    },
  };
}
