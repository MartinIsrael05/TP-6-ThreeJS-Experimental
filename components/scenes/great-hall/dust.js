import * as THREE from "three";

// Sprite redondo y suave dibujado en un canvas: evita bajar una imagen.
function dotTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Polvo flotando en la luz de las velas: sube despacio, se mece y vuelve a
// empezar abajo cuando llega arriba.
export function createDust({ count, bounds }) {
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = THREE.MathUtils.randFloat(bounds.min.x, bounds.max.x);
    positions[index * 3 + 1] = THREE.MathUtils.randFloat(bounds.min.y, bounds.max.y);
    positions[index * 3 + 2] = THREE.MathUtils.randFloat(bounds.min.z, bounds.max.z);
    speeds[index] = THREE.MathUtils.randFloat(0.04, 0.12);
    phases[index] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      map: dotTexture(),
      color: "#ffd9a0",
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  const height = bounds.max.y - bounds.min.y;

  return {
    points,
    update(time, delta) {
      if (delta === 0) return;
      for (let index = 0; index < count; index += 1) {
        const i = index * 3;
        positions[i] += Math.sin(time * 0.5 + phases[index]) * 0.0015;
        positions[i + 1] += speeds[index] * delta;
        if (positions[i + 1] > bounds.max.y) positions[i + 1] -= height;
      }
      attribute.needsUpdate = true;
    },
  };
}
