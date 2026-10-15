import * as THREE from "three";

// Sombrero Seleccionador provisorio, hecho con LatheGeometry (se reemplaza
// después por el modelo de Maya). Lathe gira un perfil 2D alrededor del eje
// Y: los puntos van del ala, abajo, a la punta, arriba.
const PROFILE = [
  [0, 0],
  [0.5, 0],
  [0.52, 0.025],
  [0.47, 0.055],
  [0.27, 0.065],
  [0.25, 0.14],
  [0.22, 0.32],
  [0.17, 0.52],
  [0.12, 0.7],
  [0.07, 0.86],
  [0.03, 0.98],
  [0, 1.02],
];

function hatGeometry() {
  const geometry = new THREE.LatheGeometry(
    PROFILE.map(([x, y]) => new THREE.Vector2(x, y)),
    48,
  );

  // Arrugas y punta torcida: se mueven los vértices de la parte alta.
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    if (vertex.y > 0.1) {
      const angle = Math.atan2(vertex.z, vertex.x);
      const wrinkle = 1 + 0.05 * Math.sin(angle * 5 + vertex.y * 9) * Math.min(1, vertex.y * 2);
      vertex.x *= wrinkle;
      vertex.z *= wrinkle;
    }
    if (vertex.y > 0.5) {
      const bend = vertex.y - 0.5;
      vertex.x += bend * bend * 0.9; // la punta se inclina hacia un costado
      vertex.y -= bend * bend * 0.35; // y cae un poco
    }
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function stool(material) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.3, 0.07, 20), material);
  seat.position.y = 0.62;
  group.add(seat);
  const legGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.62, 8);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeometry, material);
    leg.position.set(Math.cos(angle) * 0.2, 0.31, Math.sin(angle) * 0.2);
    leg.rotation.set(Math.sin(angle) * 0.12, 0, -Math.cos(angle) * 0.12); // patas un poco abiertas
    group.add(leg);
  }
  return group;
}

export function createSortingHat({ position, stoolMaterial }) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.add(stool(stoolMaterial));

  const hatMaterial = new THREE.MeshStandardMaterial({
    color: "#5d4934",
    roughness: 0.95,
    emissive: "#ffbf5a",
    emissiveIntensity: 0,
  });
  const hat = new THREE.Mesh(hatGeometry(), hatMaterial);
  hat.position.y = 0.655;
  hat.rotation.y = -0.6;
  group.add(hat);

  // Zona de toque invisible y más grande que el Sombrero: fácil de acertar
  // con el dedo. visible: false en el material no la dibuja, pero el
  // raycaster la sigue detectando.
  const hitArea = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitArea.position.y = 1.1;
  group.add(hitArea);

  let glow = 0;

  return {
    group,
    hitArea,
    // highlight de 0 a 1: el brillo sube y baja suave hacia ese valor.
    update({ elapsed, delta, highlight, idle }) {
      // Mientras espera brilla apenas (pista de que se puede tocar); con el
      // puntero encima brilla fuerte.
      const target = idle ? 0.3 + highlight * 1.3 : 0;
      glow = delta > 0 ? THREE.MathUtils.damp(glow, target, 6, delta) : target;
      hatMaterial.emissiveIntensity = glow;
      // Mientras espera, el Sombrero "respira" apenas.
      hat.scale.y = idle ? 1 + Math.sin(elapsed * 1.6) * 0.015 : 1;
    },
  };
}
