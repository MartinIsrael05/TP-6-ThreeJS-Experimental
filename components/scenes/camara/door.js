import * as THREE from "three";

// Puerta redonda de la Cámara: dos mitades que se separan, anillos de metal
// y seis serpientes enroscadas, tres en cada mitad. Cada serpiente tiene su
// tono de siseo (en semitonos) para el juego de repetir.

export const DOOR_RADIUS = 2.4;
export const SNAKE_PITCHES = [0, 3, 5, 7, 10, 12];
// Ángulo central de cada serpiente (en grados, 0 es a la derecha).
const SNAKE_ANGLES = [-60, 0, 60, 120, 180, 240];

// Cuerpo de serpiente: un arco ondulado alrededor del centro de la puerta.
function snakeCurve(angleDegrees) {
  const center = THREE.MathUtils.degToRad(angleDegrees);
  const points = [];
  for (let index = 0; index <= 24; index += 1) {
    const t = index / 24;
    const angle = center - 0.42 + t * 0.84;
    const radius = 1.65 + Math.sin(t * Math.PI * 4) * 0.13;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.2 + Math.sin(t * Math.PI) * 0.06));
  }
  return new THREE.CatmullRomCurve3(points);
}

function createSnake(index, material) {
  const group = new THREE.Group();
  group.userData.snake = index;
  const curve = snakeCurve(SNAKE_ANGLES[index]);
  const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.07, 8), material);
  body.userData.snake = index;
  group.add(body);

  // Cabeza al final del cuerpo, mirando hacia donde avanza.
  const end = curve.getPoint(1);
  const tangent = curve.getTangent(1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), material);
  head.scale.set(1, 0.7, 1.5);
  head.position.copy(end);
  head.lookAt(end.clone().add(tangent));
  head.userData.snake = index;
  group.add(head);

  const eyeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.9, 0.4) });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMaterial);
    eye.position.set(side * 0.07, 0.05, 0.08);
    head.add(eye);
  });

  // Zona de toque grande alrededor de la serpiente.
  const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hitArea.position.copy(curve.getPoint(0.5));
  hitArea.userData.snake = index;
  group.add(hitArea);

  const angle = THREE.MathUtils.degToRad(SNAKE_ANGLES[index]);
  return {
    group,
    eyeMaterial,
    hitArea,
    side: Math.cos(angle) > 0 ? 1 : -1,
    pan: Math.cos(angle) * 0.7,
    pitch: SNAKE_PITCHES[index],
  };
}

export function buildDoor() {
  const stone = new THREE.MeshStandardMaterial({ color: "#26302b", metalness: 0.55, roughness: 0.45 });
  const metal = new THREE.MeshStandardMaterial({ color: "#5d6b62", metalness: 0.9, roughness: 0.3 });
  const snakeMaterial = new THREE.MeshStandardMaterial({ color: "#1d3b2a", metalness: 0.6, roughness: 0.35, emissive: "#3fbf7a", emissiveIntensity: 0 });

  // Mitades: CylinderGeometry con medio giro; acostado mira a la cámara.
  const halves = [1, -1].map((side) => {
    const half = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(DOOR_RADIUS, DOOR_RADIUS, 0.3, 48, 1, false, side > 0 ? 0 : Math.PI, Math.PI), stone);
    disc.rotation.x = Math.PI / 2;
    half.add(disc);
    [DOOR_RADIUS - 0.12, 1.15].forEach((radius) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.06, 8, 48, Math.PI), metal);
      ring.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      ring.position.z = 0.17;
      half.add(ring);
    });
    return { group: half, side };
  });

  const snakes = SNAKE_ANGLES.map((_, index) => createSnake(index, snakeMaterial.clone()));
  snakes.forEach((snake) => halves[snake.side > 0 ? 0 : 1].group.add(snake.group));

  // Centro: repetir la secuencia.
  const centerMaterial = new THREE.MeshStandardMaterial({ color: "#3a4a40", metalness: 0.85, roughness: 0.3, emissive: "#3fbf7a", emissiveIntensity: 0.15 });
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 32), centerMaterial);
  center.rotation.x = Math.PI / 2;
  center.position.z = 0.22;

  return { halves, snakes, center, centerMaterial };
}
