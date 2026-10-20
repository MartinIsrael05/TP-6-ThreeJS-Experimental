import * as THREE from "three";
import { createPbrMaterial } from "@/lib/three/pbrTextures";

// Medidas de la torre en metros. Cada nivel tiene un descanso; los tramos
// unen un descanso con el siguiente, alternando de lado.
export const TOWER = {
  radius: 9,
  levels: 4,
  levelHeight: 3.2,
  landingX: 3.4,
  landingSize: 2.4,
  flightRun: 4.4,
  steps: 10,
};

const FLAME_COLOR = new THREE.Color(2.4, 1.2, 0.32);

export function landingPosition(level) {
  return new THREE.Vector3(level % 2 === 0 ? -TOWER.landingX : TOWER.landingX, level * TOWER.levelHeight, 0);
}

export function stoneMaterial(ctx, repeat = [1, 1]) {
  return createPbrMaterial(ctx, { folder: "gran-comedor", name: "medieval_blocks_03", repeat, color: "#5b5047", tint: "#cdbda8" });
}

// Cuadro con marco dorado y una pintura que es un degradé con una mancha:
// de lejos parece un retrato.
function portraitTexture(hue) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 80;
  const context = canvas.getContext("2d");
  const background = context.createLinearGradient(0, 0, 0, 80);
  background.addColorStop(0, `hsl(${hue}, 30%, 22%)`);
  background.addColorStop(1, `hsl(${hue}, 25%, 8%)`);
  context.fillStyle = background;
  context.fillRect(0, 0, 64, 80);
  context.fillStyle = `hsl(${(hue + 30) % 360}, 25%, 45%)`;
  context.beginPath();
  context.ellipse(32, 34, 11, 14, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `hsl(${(hue + 200) % 360}, 30%, 25%)`;
  context.beginPath();
  context.ellipse(32, 78, 24, 26, 0, Math.PI, Math.PI * 2);
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Pared cilíndrica vista desde adentro (BackSide): con la cámara afuera,
// la mitad de adelante no se dibuja y queda un corte de maqueta.
export function buildTower(ctx) {
  const group = new THREE.Group();
  const { radius } = TOWER;

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 30, 48, 1, true),
    stoneMaterial(ctx, [10, 7]),
  );
  wall.material.side = THREE.BackSide;
  wall.position.y = 13;
  group.add(wall);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), stoneMaterial(ctx, [6, 6]));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  group.add(floor);

  // Retratos en la mitad de atrás de la pared, mirando al centro.
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#b08a3a", metalness: 0.8, roughness: 0.35 });
  const portraits = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = Math.PI + 0.35 + (index % 8) * 0.34;
    const y = 1.2 + Math.floor(index / 8) * 4.6 + (index % 3) * 1.1;
    const width = 0.9 + (index % 3) * 0.25;
    const portrait = new THREE.Group();
    portrait.position.set(Math.cos(angle) * (radius - 0.15), y, Math.sin(angle) * (radius - 0.15));
    portrait.lookAt(0, y, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, width * 1.25 + 0.16, 0.08), frameMaterial);
    portrait.add(frame);
    const paint = new THREE.MeshStandardMaterial({ map: portraitTexture((index * 47) % 360), roughness: 0.8, emissive: "#ffffff", emissiveIntensity: 0 });
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 1.25), paint);
    canvas.position.z = 0.045;
    portrait.add(canvas);
    group.add(portrait);
    portraits.push({ paint, phase: index * 1.7 });
  }

  // Antorchas: soporte, llama con bloom y una luz real por antorcha.
  const torches = [];
  const bracketMaterial = new THREE.MeshStandardMaterial({ color: "#2a2420", metalness: 0.7, roughness: 0.5 });
  const flameGeometry = new THREE.SphereGeometry(0.09, 10, 8);
  flameGeometry.scale(1, 2, 1);
  [
    [Math.PI * 1.25, 2.2],
    [Math.PI * 1.75, 4.4],
    [Math.PI * 1.32, 7.6],
    [Math.PI * 1.68, 10.4],
  ].forEach(([angle, y], index) => {
    const position = new THREE.Vector3(Math.cos(angle) * (radius - 0.4), y, Math.sin(angle) * (radius - 0.4));
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 8), bracketMaterial);
    bracket.position.copy(position);
    group.add(bracket);
    const flame = new THREE.Mesh(flameGeometry, new THREE.MeshBasicMaterial({ color: FLAME_COLOR }));
    flame.position.copy(position).add(new THREE.Vector3(0, 0.38, 0));
    group.add(flame);
    // Separada de la pared y del soporte: una luz pegada a una superficie
    // da valores enormes que el bloom convierte en una mancha blanca.
    const light = new THREE.PointLight("#ffa65a", 16, 0, 2);
    light.position.copy(flame.position).multiplyScalar(0.88).setY(flame.position.y + 0.4);
    group.add(light);
    torches.push({ flame, light, phase: index * 2.1 });
  });

  return { group, portraits, torches };
}

// Descanso de piedra; los de arriba llevan una columna hasta el piso.
export function buildLanding(material, level) {
  const group = new THREE.Group();
  group.position.copy(landingPosition(level));
  const { landingSize } = TOWER;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(landingSize, 0.35, landingSize), material);
  slab.position.y = -0.175;
  group.add(slab);
  if (level > 0) {
    const height = level * TOWER.levelHeight;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, height, 12), material);
    column.position.y = -0.35 - height / 2;
    group.add(column);
  }
  return group;
}

// Runa dibujada en un canvas: un círculo con trazos distintos por tramo.
function runeTexture(seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.strokeStyle = "#ffffff";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.arc(32, 32, 26, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  for (let index = 0; index < 3; index += 1) {
    const angle = seed * 1.3 + index * 2.1;
    context.moveTo(32, 32);
    context.lineTo(32 + Math.cos(angle) * 18, 32 + Math.sin(angle) * 18);
  }
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Un tramo de escalera centrado en su eje de giro. Con rotación 0 sube
// hacia +X: de (-run/2, -alto/2) a (run/2, alto/2).
export function buildFlight(ctx, index) {
  const group = new THREE.Group();
  const { flightRun, levelHeight, steps } = TOWER;
  const run = flightRun / steps;
  const rise = levelHeight / steps;
  const width = 1.3;
  const material = stoneMaterial(ctx, [0.6, 0.3]);
  material.emissive = new THREE.Color("#ffb36b");
  material.emissiveIntensity = 0;

  const stepGeometry = new THREE.BoxGeometry(run + 0.02, 0.2, width);
  for (let step = 0; step < steps; step += 1) {
    const mesh = new THREE.Mesh(stepGeometry, material);
    mesh.position.set(-flightRun / 2 + (step + 0.5) * run, -levelHeight / 2 + (step + 1) * rise - 0.1, 0);
    group.add(mesh);
  }

  // Losa inclinada debajo de los escalones.
  const length = Math.hypot(flightRun, levelHeight);
  const slope = Math.atan2(levelHeight, flightRun);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(length, 0.22, width), material);
  slab.rotation.z = slope;
  slab.position.set(Math.sin(slope) * 0.2, -Math.cos(slope) * 0.2, 0);
  group.add(slab);

  // Barandas de hierro a los dos lados.
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#2a2420", metalness: 0.75, roughness: 0.45 });
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.05, 0.05), railMaterial);
    rail.rotation.z = slope;
    rail.position.set(0, 0.85, side * (width / 2));
    group.add(rail);
    for (let post = 0; post <= 4; post += 1) {
      const t = post / 4;
      const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6), railMaterial);
      baluster.position.set(-flightRun / 2 + t * flightRun, -levelHeight / 2 + t * levelHeight + 0.42, side * (width / 2));
      group.add(baluster);
    }
  });

  // Runa sobre el primer escalón: roja si el tramo está mal, verde si quedó bien.
  const runeMaterial = new THREE.MeshBasicMaterial({
    map: runeTexture(index),
    color: new THREE.Color(2, 0.5, 0.25),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), runeMaterial);
  rune.position.set(-flightRun / 2 + run * 0.5, -levelHeight / 2 + rise + 0.45, 0);
  group.add(rune);

  return { group, material, rune, runeMaterial };
}
