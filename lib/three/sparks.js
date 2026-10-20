import * as THREE from "three";
import { createDotTexture } from "@/lib/three/sprites";

// Chispas de hechizo: un sistema de partículas con un tope fijo (`max`) que
// se reciclan. emit() despierta las que estén libres en un punto, con
// velocidad al azar; update() las mueve, las frena y las apaga.
//
// Con blending aditivo, bajar el color a negro equivale a hacerlas
// transparentes: así el desvanecido no necesita un shader propio.
export function createSparks({ max = 400, size = 0.09, gravity = -1.2, drag = 2.2 } = {}) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const velocities = new Float32Array(max * 3);
  const base = new Float32Array(max * 3);
  const life = new Float32Array(max);
  const span = new Float32Array(max);
  let cursor = 0;
  let alive = 0;

  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: createDotTexture(),
      size,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  // Las partículas se mueven por toda la escena: el bounding sphere de la
  // geometría no sirve para descartarlas.
  points.frustumCulled = false;

  const color = new THREE.Color();

  // count partículas desde position. color acepta cualquier valor de
  // THREE.Color; los que pasan de 1 brillan más con bloom.
  function emit(position, { count = 40, speed = 2.4, color: tint = "#ffd88a", intensity = 1.6, lifetime = 0.9, direction } = {}) {
    color.set(tint).multiplyScalar(intensity);
    for (let index = 0; index < count; index += 1) {
      const i = cursor;
      cursor = (cursor + 1) % max;
      if (life[i] <= 0) alive += 1;

      // Dirección al azar en la esfera; con direction se inclina hacia ahí.
      const theta = Math.random() * Math.PI * 2;
      const z = Math.random() * 2 - 1;
      const r = Math.sqrt(1 - z * z);
      const magnitude = speed * (0.35 + Math.random() * 0.65);
      let vx = r * Math.cos(theta);
      let vy = r * Math.sin(theta);
      let vz = z;
      if (direction) {
        vx = vx * 0.5 + direction.x;
        vy = vy * 0.5 + direction.y;
        vz = vz * 0.5 + direction.z;
      }
      velocities[i * 3] = vx * magnitude;
      velocities[i * 3 + 1] = vy * magnitude;
      velocities[i * 3 + 2] = vz * magnitude;
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Cada chispa varía un poco el tono para que no se vean planas.
      const shade = 0.7 + Math.random() * 0.5;
      base[i * 3] = color.r * shade;
      base[i * 3 + 1] = color.g * shade;
      base[i * 3 + 2] = color.b * shade;
      span[i] = lifetime * (0.5 + Math.random() * 0.8);
      life[i] = span[i];
    }
  }

  function update(delta) {
    if (alive === 0 || delta === 0) return;
    const damping = Math.exp(-drag * delta);
    for (let i = 0; i < max; i += 1) {
      if (life[i] <= 0) continue;
      life[i] -= delta;
      const j = i * 3;
      if (life[i] <= 0) {
        alive -= 1;
        colors[j] = colors[j + 1] = colors[j + 2] = 0;
        continue;
      }
      velocities[j] *= damping;
      velocities[j + 1] = velocities[j + 1] * damping + gravity * delta;
      velocities[j + 2] *= damping;
      positions[j] += velocities[j] * delta;
      positions[j + 1] += velocities[j + 1] * delta;
      positions[j + 2] += velocities[j + 2] * delta;
      // Se apagan con una curva: brillan casi todo el tiempo y caen al final.
      const fade = Math.min(1, (life[i] / span[i]) * 1.6);
      colors[j] = base[j] * fade;
      colors[j + 1] = base[j + 1] * fade;
      colors[j + 2] = base[j + 2] * fade;
    }
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  return { points, emit, update, isIdle: () => alive === 0 };
}
