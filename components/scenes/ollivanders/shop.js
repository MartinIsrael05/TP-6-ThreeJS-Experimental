import * as THREE from "three";
import { createPbrMaterial } from "@/lib/three/pbrTextures";

// Medidas de la tienda en metros: angosta, alta y llena de cajas.
export const SHOP = { halfWidth: 2.6, back: -3, front: 1.2, height: 4.4 };

const BOX = { width: 0.105, height: 0.095, depth: 0.38 };
const SHELF_FROM = 0.45;
const SHELF_STEP = 0.42;
const SHELF_ROWS = 8;
const BOX_COLORS = ["#5a2a22", "#3b2a20", "#6b4a2e", "#2f3540", "#4a3b2a", "#7a6248", "#2b2f26"];

// Generador con semilla: las cajas quedan siempre en el mismo lugar.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Una fila de cajas sobre un estante. origin es el centro del borde
// delantero del estante, along la dirección de la fila y facing hacia dónde
// mira la tapa de las cajas.
function boxRow(random, out, { origin, along, facing, length }) {
  const count = Math.floor(length / (BOX.width + 0.008));
  const yaw = Math.atan2(facing.x, facing.z);
  for (let index = 0; index < count; index += 1) {
    if (random() < 0.06) continue; // algún hueco: alguien ya se llevó esa varita
    for (let stack = 0; stack < 2; stack += 1) {
      if (stack === 1 && random() < 0.35) continue;
      const offset = (index + 0.5) * (BOX.width + 0.008) - length / 2;
      const position = origin
        .clone()
        .addScaledVector(along, offset)
        .addScaledVector(facing, -BOX.depth / 2 + (random() - 0.5) * 0.06);
      position.y += BOX.height / 2 + stack * (BOX.height + 0.004);
      out.push({ position, yaw: yaw + (random() - 0.5) * 0.06, facing: facing.clone() });
    }
  }
}

// Arma paredes, estantes, cajas y mostrador. Devuelve las cajas (un solo
// InstancedMesh) con los datos de cada una para animarlas.
export function buildShop(ctx) {
  const group = new THREE.Group();
  const random = seededRandom(11);
  const { halfWidth, back, front, height } = SHOP;
  const depth = front - back;

  const wood = createPbrMaterial(ctx, { folder: "gran-comedor", name: "dark_wood", repeat: [2, 1], color: "#3a2618", tint: "#9a7a5c" });
  const floorWood = createPbrMaterial(ctx, { folder: "gran-comedor", name: "dark_wood", repeat: [3, 3], color: "#2a1c12", tint: "#7a5c44" });
  const plaster = new THREE.MeshStandardMaterial({ color: "#2b2119", roughness: 0.95 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, depth + 4), floorWood);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = (front + back) / 2 + 2;
  group.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, height), plaster);
  backWall.position.set(0, height / 2, back);
  group.add(backWall);

  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(depth + 4, height), plaster);
    wall.rotation.y = -side * (Math.PI / 2);
    wall.position.set(side * halfWidth, height / 2, (front + back) / 2 + 2);
    group.add(wall);
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, depth + 4), plaster);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height, (front + back) / 2 + 2);
  group.add(ceiling);

  // Estantes: tablas en la pared del fondo y en las dos laterales.
  const boxes = [];
  const shelfGeometry = new THREE.BoxGeometry(1, 0.03, BOX.depth + 0.06);
  for (let row = 0; row < SHELF_ROWS; row += 1) {
    const y = SHELF_FROM + row * SHELF_STEP;

    const backShelf = new THREE.Mesh(shelfGeometry, wood);
    backShelf.scale.x = halfWidth * 2;
    backShelf.position.set(0, y - 0.015, back + BOX.depth / 2 + 0.03);
    group.add(backShelf);
    boxRow(random, boxes, {
      origin: new THREE.Vector3(0, y, back + BOX.depth + 0.04),
      along: new THREE.Vector3(1, 0, 0),
      facing: new THREE.Vector3(0, 0, 1),
      length: halfWidth * 2 - 0.1,
    });

    [-1, 1].forEach((side) => {
      const sideShelf = new THREE.Mesh(shelfGeometry, wood);
      sideShelf.scale.x = depth + 1.8;
      sideShelf.rotation.y = Math.PI / 2;
      sideShelf.position.set(side * (halfWidth - BOX.depth / 2 - 0.03), y - 0.015, back + (depth + 1.8) / 2);
      group.add(sideShelf);
      boxRow(random, boxes, {
        origin: new THREE.Vector3(side * (halfWidth - BOX.depth - 0.04), y, back + (depth + 1.8) / 2),
        along: new THREE.Vector3(0, 0, 1),
        facing: new THREE.Vector3(-side, 0, 0),
        length: depth + 1.7,
      });
    });
  }

  const boxMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(BOX.width, BOX.height, BOX.depth),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    boxes.length,
  );
  const color = new THREE.Color();
  boxes.forEach((box, index) => {
    box.color = new THREE.Color(BOX_COLORS[Math.floor(random() * BOX_COLORS.length)]).multiplyScalar(0.8 + random() * 0.4);
    boxMesh.setColorAt(index, color.copy(box.color));
  });
  group.add(boxMesh);

  // Mostrador con la caja abierta, la vela y el frasco.
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 0.7), wood);
  counter.position.set(0, 0.5, front - 0.2);
  group.add(counter);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.05, 0.8), wood);
  counterTop.position.set(0, 1.025, front - 0.2);
  group.add(counterTop);

  return { group, boxes, boxMesh, counterTopY: 1.05, counterZ: front - 0.2 };
}

// Coloca una caja en su lugar, corrida hacia afuera `pull` metros.
const dummy = new THREE.Object3D();
export function placeBox(mesh, box, index, pull = 0, shake = 0) {
  dummy.position.copy(box.position).addScaledVector(box.facing, pull);
  if (shake) {
    dummy.position.x += (Math.random() - 0.5) * shake;
    dummy.position.y += (Math.random() - 0.5) * shake;
  }
  dummy.rotation.set(0, box.yaw, 0);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}
