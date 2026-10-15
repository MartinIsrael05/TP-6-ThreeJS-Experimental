import * as THREE from "three";

// Generador pseudoaleatorio con semilla (mulberry32): las velas quedan siempre
// en el mismo lugar, en cada visita y en cada captura.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLAME_COLOR = new THREE.Color(2.4, 1.2, 0.32); // pasa de 1: el bloom la hace brillar

// Velas flotantes: dos InstancedMesh (cuerpo y llama) de `count` instancias.
// No son luces reales: la llama usa un color por encima de 1 y el bloom del
// postprocesado la hace brillar. Las luces de la sala dan la iluminación.
export function createCandles({ count, bounds, avoid, seed = 7 }) {
  const random = seededRandom(seed);
  const candles = [];
  while (candles.length < count) {
    const position = new THREE.Vector3(
      THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, random()),
      THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, random()),
      THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, random()),
    );
    if (position.distanceTo(avoid.point) < avoid.radius) continue; // ni pegadas a la cámara
    candles.push({
      position,
      phase: random() * Math.PI * 2,
      bob: 0.04 + random() * 0.05,
      height: 0.24 + random() * 0.14,
    });
  }

  const body = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.04, 1, 8),
    new THREE.MeshStandardMaterial({ color: "#efe3c8", roughness: 0.55, emissive: "#ffcf8a", emissiveIntensity: 0.12 }),
    count,
  );
  const flameGeometry = new THREE.SphereGeometry(0.032, 8, 6);
  flameGeometry.scale(1, 2.3, 1);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: FLAME_COLOR.clone() });
  const flame = new THREE.InstancedMesh(flameGeometry, flameMaterial, count);

  const dummy = new THREE.Object3D();
  const targetColor = FLAME_COLOR.clone();

  // Recoloca las instancias. Con el tiempo quieto se calcula una sola vez.
  let lastTime = -1;
  function update(time, delta) {
    if (time !== lastTime) {
      lastTime = time;
      candles.forEach((candle, index) => {
        const { position, phase, bob, height } = candle;
        const y = position.y + Math.sin(time * 0.6 + phase) * bob;
        const sway = Math.sin(time * 0.4 + phase * 1.3) * 0.015;

        dummy.position.set(position.x + sway, y, position.z);
        dummy.rotation.set(0, 0, sway * 2);
        dummy.scale.set(1, height, 1);
        dummy.updateMatrix();
        body.setMatrixAt(index, dummy.matrix);

        // Titileo de la llama: dos senos rápidos con la fase de cada vela.
        const flicker = 1 + Math.sin(time * 11 + phase * 3) * 0.16 + Math.sin(time * 17.3 + phase) * 0.09;
        dummy.position.set(position.x + sway, y + height / 2 + 0.05, position.z);
        dummy.scale.set(flicker, flicker * (0.9 + 0.2 * Math.sin(time * 7 + phase)), flicker);
        dummy.updateMatrix();
        flame.setMatrixAt(index, dummy.matrix);
      });
      body.instanceMatrix.needsUpdate = true;
      flame.instanceMatrix.needsUpdate = true;
    }

    // El color de la llama se acerca de a poco al tinte pedido.
    if (!flameMaterial.color.equals(targetColor)) {
      flameMaterial.color.lerp(targetColor, delta > 0 ? 1 - Math.exp(-delta * 2.5) : 1);
    }
  }

  return {
    meshes: [body, flame],
    update,
    // Tiñe apenas las llamas (amount de 0 a 1) con un color, sin perder el brillo.
    setTint(color, amount) {
      targetColor.copy(FLAME_COLOR);
      if (color) {
        const tint = new THREE.Color(color).multiplyScalar(2.6);
        targetColor.lerp(tint, amount);
      }
    },
  };
}
