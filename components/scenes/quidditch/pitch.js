import * as THREE from "three";
import { houses } from "@/data/houses";

// Campo de Quidditch de noche: cielo, estrellas, césped a franjas, los tres
// aros del fondo y las torres de las tribunas con los colores de las casas.

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Degradé del horizonte al cenit con un resplandor del lado de la luna.
const skyFragment = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uMoonDirection;
  varying vec3 vDirection;
  void main() {
    float height = clamp(vDirection.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(height, 0.6));
    float moonGlow = pow(max(dot(vDirection, uMoonDirection), 0.0), 24.0);
    color += vec3(0.5, 0.6, 0.8) * moonGlow * 0.6;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function grassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  for (let stripe = 0; stripe < 8; stripe += 1) {
    context.fillStyle = stripe % 2 ? "#1f3a1c" : "#25451f";
    context.fillRect(0, stripe * 32, 256, 32);
  }
  // Ruido fino para que no se vea plano.
  for (let index = 0; index < 4000; index += 1) {
    context.fillStyle = `rgba(0,0,0,${Math.random() * 0.15})`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 1, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 6);
  return texture;
}

export const MOON_DIRECTION = new THREE.Vector3(-0.5, 0.45, -0.75).normalize();

export function buildPitch() {
  const group = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color("#1c2944") },
        uZenith: { value: new THREE.Color("#04060d") },
        uMoonDirection: { value: MOON_DIRECTION },
      },
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  group.add(sky);

  const moon = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.5), fog: false }));
  moon.position.copy(MOON_DIRECTION).multiplyScalar(85);
  moon.lookAt(0, 0, 0);
  group.add(moon);

  // Estrellas en la mitad de arriba del cielo.
  const starPositions = new Float32Array(700 * 3);
  for (let index = 0; index < 700; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const y = 0.08 + Math.random() * 0.92;
    const r = Math.sqrt(1 - y * y);
    starPositions.set([Math.cos(theta) * r * 80, y * 80, Math.sin(theta) * r * 80], index * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  group.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#dfe6ff", size: 0.25, fog: false })));

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(70, 110), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -20;
  group.add(ground);

  // Los tres aros del fondo: postes y anillos dorados.
  const goldMaterial = new THREE.MeshStandardMaterial({ color: "#c9a227", metalness: 0.85, roughness: 0.3 });
  [
    [-5, 9],
    [0, 12],
    [5, 9],
  ].forEach(([x, height]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, height, 12), goldMaterial);
    pole.position.set(x, height / 2, -30);
    group.add(pole);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.1, 12, 48), goldMaterial);
    hoop.position.set(x, height + 1.4, -30);
    group.add(hoop);
  });

  // Tribunas: torres de madera con techo en punta y una tela de cada casa.
  const woodMaterial = new THREE.MeshStandardMaterial({ color: "#3b2b1e", roughness: 0.9 });
  const clothMaterials = houses.map((house) => new THREE.MeshStandardMaterial({ color: house.color, roughness: 0.8, side: THREE.DoubleSide }));
  let tower = 0;
  [-1, 1].forEach((side) => {
    for (let z = -34; z <= 2; z += 6) {
      const height = 9 + ((tower * 7) % 5);
      const body = new THREE.Mesh(new THREE.BoxGeometry(4, height, 4), woodMaterial);
      body.position.set(side * 19, height / 2, z);
      group.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 3, 4), clothMaterials[tower % 4]);
      roof.position.set(side * 19, height + 1.5, z);
      roof.rotation.y = Math.PI / 4;
      group.add(roof);
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(3.6, height * 0.55), clothMaterials[tower % 4]);
      cloth.position.set(side * 16.98, height * 0.65, z);
      cloth.rotation.y = side * -Math.PI / 2;
      group.add(cloth);
      tower += 1;
    }
  });

  return group;
}
