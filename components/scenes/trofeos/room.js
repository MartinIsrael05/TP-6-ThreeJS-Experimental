import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createPbrMaterial } from "@/lib/three/pbrTextures";

// Sala de trofeos: un pasillo largo que va hacia -z, con vitrinas de copas
// en las paredes, armaduras en los puntos de control y antorchas. Las piezas
// que se repiten (vitrinas, copas, platos, armaduras) son InstancedMesh: una
// sola llamada de dibujo por tipo.

export const ROOM = { halfWidth: 3.5, height: 5, near: 13, far: -15 };
// Puerta de salida, en la pared derecha.
export const EXIT = new THREE.Vector3(ROOM.halfWidth, 0, -5.5);

const CABINETS = [
  [-1, 8], [-1, 4.5], [-1, 1], [-1, -2.5], [-1, -6], [-1, -9.5],
  [1, 8], [1, 4.5], [1, 1], [1, -2.5], [1, -9.5],
];
const SHELVES = [0.75, 1.45, 2.15];

// Mueble de una vitrina, abierto adelante: fondo, costados, techo, base y
// estantes en una sola geometría. Mira hacia +z.
function cabinetGeometry() {
  const parts = [];
  const box = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));
  box(1.8, 2.7, 0.06, 0, 1.35, -0.27);
  box(0.08, 2.7, 0.6, -0.86, 1.35, 0);
  box(0.08, 2.7, 0.6, 0.86, 1.35, 0);
  box(1.9, 0.12, 0.66, 0, 2.76, 0);
  box(1.9, 0.4, 0.66, 0, 0.2, 0);
  SHELVES.forEach((y) => box(1.66, 0.04, 0.5, 0, y - 0.02, 0));
  return mergeGeometries(parts);
}

// Copa de trofeo torneada: pie, tallo, cáliz y dos asas.
function cupGeometry() {
  const profile = [
    [0, 0], [0.09, 0], [0.09, 0.02], [0.03, 0.05], [0.025, 0.14], [0.05, 0.17],
    [0.1, 0.22], [0.11, 0.32], [0.1, 0.33], [0.085, 0.24], [0, 0.2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.LatheGeometry(profile, 20);
  const handles = [-1, 1].map((side) =>
    new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI).rotateZ(-side * Math.PI / 2).translate(side * 0.105, 0.27, 0),
  );
  // La copa es indexada; el toro también: se pueden juntar.
  return mergeGeometries([cup, ...handles]);
}

// Armadura de pie con alabarda, hecha de piezas simples.
function armorGeometry() {
  const parts = [];
  const add = (geometry, x, y, z) => parts.push(geometry.translate(x, y, z));
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 10), -0.12, 0.45, 0);
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 10), 0.12, 0.45, 0);
  add(new THREE.BoxGeometry(0.18, 0.08, 0.28), -0.12, 0.04, 0.05);
  add(new THREE.BoxGeometry(0.18, 0.08, 0.28), 0.12, 0.04, 0.05);
  add(new THREE.CylinderGeometry(0.26, 0.2, 0.35, 12), 0, 1.0, 0);
  add(new THREE.CylinderGeometry(0.2, 0.28, 0.55, 12), 0, 1.42, 0);
  add(new THREE.SphereGeometry(0.13, 12, 8), -0.32, 1.62, 0);
  add(new THREE.SphereGeometry(0.13, 12, 8), 0.32, 1.62, 0);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), -0.36, 1.3, 0.04);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8), 0.36, 1.3, 0.04);
  add(new THREE.SphereGeometry(0.16, 14, 10), 0, 1.9, 0);
  add(new THREE.ConeGeometry(0.05, 0.18, 8), 0, 2.1, 0);
  add(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 6), 0.42, 1.25, 0.08);
  add(new THREE.ConeGeometry(0.07, 0.3, 4), 0.42, 2.6, 0.08);
  add(new THREE.BoxGeometry(0.02, 0.22, 0.2), 0.42, 2.42, 0.16);
  return mergeGeometries(parts);
}

function placeInstances(mesh, transforms) {
  const dummy = new THREE.Object3D();
  transforms.forEach(({ position, rotationY = 0, scale = 1 }, index) => {
    dummy.position.copy(position);
    dummy.rotation.set(0, rotationY, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

export function buildRoom(ctx, { armorZ }) {
  const group = new THREE.Group();
  const { halfWidth, height, near, far } = ROOM;
  const length = near - far;
  const centerZ = (near + far) / 2;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(halfWidth * 2, length),
    createPbrMaterial(ctx, { folder: "gran-comedor", name: "floor_tiles_02", repeat: [3, 12], color: "#3a342e", tint: "#8f877c", roughness: 0.6 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = centerZ;
  group.add(floor);

  const stone = createPbrMaterial(ctx, { folder: "gran-comedor", name: "medieval_blocks_03", repeat: [9, 2], color: "#3b3631", tint: "#8e877c" });
  [-1, 1].forEach((side) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(length, height), stone);
    wall.rotation.y = -side * Math.PI / 2;
    wall.position.set(side * halfWidth, height / 2, centerZ);
    group.add(wall);
  });
  const end = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, height), stone);
  end.position.set(0, height / 2, far);
  group.add(end);
  // Ventanal con luna al fondo: Filch se recorta contra la luz y se lo ve
  // aunque esté de espaldas.
  const arch = new THREE.Shape();
  arch.moveTo(-0.8, 0);
  arch.lineTo(0.8, 0);
  arch.lineTo(0.8, 1.9);
  arch.absarc(0, 1.9, 0.8, 0, Math.PI, false);
  arch.closePath();
  const moonWindow = new THREE.Mesh(new THREE.ShapeGeometry(arch, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.25, 0.55), fog: false }));
  moonWindow.position.set(0, 1.1, far + 0.02);
  group.add(moonWindow);
  const mullions = new THREE.Mesh(
    mergeGeometries([new THREE.BoxGeometry(0.06, 2.7, 0.04).translate(0, 1.35, 0), new THREE.BoxGeometry(1.6, 0.06, 0.04).translate(0, 1.5, 0)]),
    new THREE.MeshStandardMaterial({ color: "#14110f", roughness: 0.9 }),
  );
  mullions.position.set(0, 1.1, far + 0.05);
  group.add(mullions);
  const moon = new THREE.PointLight("#7f9cd6", 6, 10, 1.4);
  moon.position.set(0, 2.6, far + 1);
  group.add(moon);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, length), new THREE.MeshStandardMaterial({ color: "#0d0b0a", roughness: 1 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, height, centerZ);
  group.add(ceiling);

  // Vitrinas: el mueble, un vidrio que refleja la linterna y lo de adentro.
  const wood = createPbrMaterial(ctx, { folder: "gran-comedor", name: "dark_wood", repeat: [1, 2], color: "#2a1a10", tint: "#a38f7c", roughness: 0.7 });
  const cabinets = new THREE.InstancedMesh(cabinetGeometry(), wood, CABINETS.length);
  const glass = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1.7, 2.6).translate(0, 1.38, 0.31),
    new THREE.MeshStandardMaterial({ color: "#9fb4c8", transparent: true, opacity: 0.1, roughness: 0.04, metalness: 1, depthWrite: false }),
    CABINETS.length,
  );
  const cabinetTransforms = CABINETS.map(([side, z]) => ({
    position: new THREE.Vector3(side * (halfWidth - 0.32), 0, z),
    rotationY: -side * Math.PI / 2,
  }));
  placeInstances(cabinets, cabinetTransforms);
  placeInstances(glass, cabinetTransforms);
  group.add(cabinets, glass);

  // Copas y platos: dos copas y un plato parado por estante.
  const gold = new THREE.MeshStandardMaterial({ color: "#c9a227", metalness: 1, roughness: 0.28 });
  const silver = new THREE.MeshStandardMaterial({ color: "#b8bcc4", metalness: 1, roughness: 0.22 });
  const cupTransforms = [];
  const plateTransforms = [];
  CABINETS.forEach(([side, z]) => {
    const x = side * (halfWidth - 0.36);
    SHELVES.forEach((shelfY, shelf) => {
      [-0.5, 0.5].forEach((offset, index) => {
        cupTransforms.push({
          position: new THREE.Vector3(x, shelfY, z + offset),
          rotationY: Math.random() * Math.PI,
          scale: 0.8 + ((shelf + index) % 3) * 0.2,
        });
      });
      plateTransforms.push({ position: new THREE.Vector3(x + side * 0.1, shelfY + 0.2, z), rotationY: -side * Math.PI / 2 });
    });
  });
  const cups = new THREE.InstancedMesh(cupGeometry(), gold, cupTransforms.length);
  placeInstances(cups, cupTransforms);
  const plates = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.015, 24).rotateX(Math.PI / 2), silver, plateTransforms.length);
  placeInstances(plates, plateTransforms);
  group.add(cups, plates);

  // Armaduras a los dos lados de cada punto de control.
  const armorTransforms = armorZ.flatMap((z) =>
    [-1, 1].map((side) => ({ position: new THREE.Vector3(side * (halfWidth - 0.75), 0, z), rotationY: -side * 0.5 })),
  );
  const armors = new THREE.InstancedMesh(armorGeometry(), new THREE.MeshStandardMaterial({ color: "#7d8188", metalness: 0.9, roughness: 0.32 }), armorTransforms.length);
  placeInstances(armors, armorTransforms);
  group.add(armors);

  // Puerta de salida: marco de piedra, hoja de madera y un resplandor detrás
  // que se enciende cuando llegás.
  const exit = new THREE.Group();
  exit.position.copy(EXIT);
  exit.rotation.y = -Math.PI / 2;
  const frame = new THREE.Mesh(
    mergeGeometries([
      new THREE.BoxGeometry(0.2, 2.6, 0.3).translate(-0.75, 1.3, 0),
      new THREE.BoxGeometry(0.2, 2.6, 0.3).translate(0.75, 1.3, 0),
      new THREE.BoxGeometry(1.7, 0.25, 0.3).translate(0, 2.72, 0),
    ]),
    stone,
  );
  // La hoja gira sobre la bisagra de la izquierda; el resplandor queda justo
  // delante de la pared y la hoja cerrada lo tapa.
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.5, 0.08), wood);
  leaf.geometry.translate(0.65, 1.25, 0);
  leaf.position.set(-0.65, 0, 0.08);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.5).translate(0, 1.25, 0.02), glowMaterial);
  exit.add(frame, leaf, glow);
  group.add(exit);

  // Antorchas: soporte, llama con bloom y una luz cálida.
  const flames = [];
  const bracketMaterial = new THREE.MeshStandardMaterial({ color: "#1b1714", metalness: 0.6, roughness: 0.5 });
  const flameGeometry = new THREE.ConeGeometry(0.05, 0.16, 10);
  [[-1, 5], [1, 2], [-1, -1.5], [1, -8]].forEach(([side, z]) => {
    const torch = new THREE.Group();
    torch.position.set(side * (halfWidth - 0.12), 2.9, z);
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.4, 8), bracketMaterial);
    bracket.rotation.z = side * 0.5;
    torch.add(bracket);
    const flame = new THREE.Mesh(flameGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.9, 0.22) }));
    flame.position.set(-side * 0.1, 0.26, 0);
    torch.add(flame);
    const light = new THREE.PointLight("#ff9d4d", 5, 7, 1.6);
    light.position.set(-side * 0.35, 0.35, 0);
    torch.add(light);
    group.add(torch);
    flames.push({ flame, light, phase: Math.random() * 10 });
  });

  return { group, flames, exitLeaf: leaf, exitGlow: glowMaterial };
}
