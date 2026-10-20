import * as THREE from "three";
import { getAudio } from "@/lib/audio/engine";
import { createDotTexture } from "@/lib/three/sprites";

// Volumen donde vuela la snitch, delante de la cámara.
export const FLIGHT_BOX = new THREE.Box3(new THREE.Vector3(-7, 2, -7), new THREE.Vector3(7, 8, 5));

// Ala con forma de pluma, con el origen en la raíz para batirla desde ahí.
function wingGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.12, 0.12, 0.38, 0.16, 0.56, 0.08);
  shape.bezierCurveTo(0.42, 0.02, 0.3, -0.06, 0, -0.04);
  return new THREE.ShapeGeometry(shape, 12);
}

export function createSnitch() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 24, 16),
    new THREE.MeshStandardMaterial({ color: "#d9a92b", metalness: 1, roughness: 0.25, emissive: "#8a5a0b", emissiveIntensity: 0.8 }),
  );
  group.add(body);

  const wingMaterial = new THREE.MeshStandardMaterial({ color: "#e8e4d8", metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const wings = [-1, 1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.x = side * 0.12;
    const wing = new THREE.Mesh(wingGeometry(), wingMaterial);
    wing.scale.x = side;
    pivot.add(wing);
    group.add(pivot);
    return { pivot, side };
  });

  // Halo: la snitch es chiquita, el brillo ayuda a no perderla de vista.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createDotTexture(), color: new THREE.Color(1.6, 1.2, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  halo.scale.setScalar(1.3);
  group.add(halo);

  // Zona de toque invisible bastante más grande que la snitch.
  const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
  group.add(hitArea);

  return {
    group,
    hitArea,
    flap(time, speed, folded) {
      wings.forEach(({ pivot, side }) => {
        const beat = folded ? 0.2 : Math.sin(time * speed) * 0.9;
        pivot.rotation.z = side * beat;
        pivot.rotation.y = side * (folded ? 1.2 : 0.2);
      });
    },
  };
}

// Vuelo: la snitch persigue un punto al azar y cada tanto lo cambia. Con
// el cansancio (0 a 1) vuela más lento y cambia de idea menos seguido.
export function createFlight(start) {
  const position = start.clone();
  const velocity = new THREE.Vector3(2, 0, 0);
  const target = new THREE.Vector3();
  const steer = new THREE.Vector3();
  let retarget = 0;
  let boost = 0;

  function pickTarget(away) {
    target.set(
      THREE.MathUtils.randFloat(FLIGHT_BOX.min.x, FLIGHT_BOX.max.x),
      THREE.MathUtils.randFloat(FLIGHT_BOX.min.y, FLIGHT_BOX.max.y),
      THREE.MathUtils.randFloat(FLIGHT_BOX.min.z, FLIGHT_BOX.max.z),
    );
    // Al escapar, elige el lado contrario de donde está.
    if (away) target.x = -Math.sign(position.x || 1) * Math.abs(target.x);
  }
  pickTarget(false);

  return {
    position,
    velocity,
    dart() {
      pickTarget(true);
      boost = 1;
      retarget = 1.2;
    },
    update(delta, fatigue) {
      retarget -= delta;
      if (retarget <= 0 || position.distanceTo(target) < 0.8) {
        pickTarget(false);
        retarget = THREE.MathUtils.lerp(0.5, 1.6, fatigue) + Math.random() * 0.6;
      }
      boost = Math.max(0, boost - delta * 1.2);
      const maxSpeed = THREE.MathUtils.lerp(7.5, 2.4, fatigue) * (1 + boost * 1.4);
      steer.subVectors(target, position).setLength(maxSpeed).sub(velocity).clampLength(0, 16 * delta);
      velocity.add(steer).clampLength(0, maxSpeed);
      position.addScaledVector(velocity, delta);
    },
    // Va derecho a un punto (Accio, o atrapada).
    pull(point, delta, strength = 5) {
      velocity.lerp(new THREE.Vector3().subVectors(point, position).multiplyScalar(strength), Math.min(1, delta * 6));
      position.addScaledVector(velocity, delta);
    },
  };
}

// Zumbido de las alas: un diente de sierra filtrado con un trémolo rápido.
// Se arma la primera vez que el audio está disponible y se mueve en el
// estéreo según dónde está la snitch en la pantalla.
export function createBuzz() {
  let nodes = null;

  function build(audio) {
    const { context } = audio;
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 200;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 1.5;
    const tremolo = context.createGain();
    tremolo.gain.value = 0.5;
    const flutter = context.createOscillator();
    flutter.type = "square";
    flutter.frequency.value = 36;
    const flutterDepth = context.createGain();
    flutterDepth.gain.value = 0.45;
    flutter.connect(flutterDepth).connect(tremolo.gain);
    const panner = context.createStereoPanner();
    const volume = context.createGain();
    volume.gain.value = 0;
    oscillator.connect(filter).connect(tremolo).connect(panner).connect(volume).connect(audio.spatial);
    oscillator.start();
    flutter.start();
    nodes = { context, oscillator, flutter, filter, tremolo, flutterDepth, panner, volume };
  }

  return {
    update({ pan, distance, speed, quiet }) {
      if (!nodes) {
        const audio = getAudio();
        if (!audio) return;
        build(audio);
      }
      const now = nodes.context.currentTime;
      const level = quiet ? 0.04 : Math.min(0.5, 2.6 / Math.max(distance, 1));
      nodes.volume.gain.setTargetAtTime(level, now, 0.05);
      nodes.panner.pan.setTargetAtTime(THREE.MathUtils.clamp(pan, -1, 1), now, 0.05);
      nodes.oscillator.frequency.setTargetAtTime(170 + speed * 22, now, 0.08);
      nodes.flutter.frequency.setTargetAtTime(quiet ? 12 : 30 + speed * 2, now, 0.1);
    },
    dispose() {
      if (!nodes) return;
      nodes.volume.gain.setTargetAtTime(0, nodes.context.currentTime, 0.05);
      const { oscillator, flutter, ...rest } = nodes;
      oscillator.stop(nodes.context.currentTime + 0.3);
      flutter.stop(nodes.context.currentTime + 0.3);
      oscillator.addEventListener("ended", () => {
        [oscillator, flutter, ...Object.values(rest).filter((node) => node.disconnect)].forEach((node) => node.disconnect());
      });
      nodes = null;
    },
  };
}
