"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { getHouse } from "@/data/houses";
import { getWand } from "@/data/wands";
import { useThreeScene } from "@/hooks/useThreeScene";
import { createDust } from "@/components/scenes/great-hall/dust";
import { buildShop, placeBox } from "@/components/scenes/ollivanders/shop";
import { playSfx } from "@/lib/audio/sfx";
import { createShakeDetector } from "@/lib/gestures/shake";
import { createPointer, damp } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

const CAMERA_POSITION = new THREE.Vector3(0, 1.75, 4.3);
const CAMERA_TARGET = new THREE.Vector3(0, 1.45, -1);
const FLAME_COLOR = new THREE.Color(2.4, 1.2, 0.32);
const UP = new THREE.Vector3(0, 1, 0);
// Donde flota la varita que tenés en la mano: cerca de la cámara, para verla.
const PRESENT_POINT = new THREE.Vector3(0.35, 1.62, 2.75);
const CENTER = new THREE.Vector2();

// Vela: cilindro de cera, llama que brilla con bloom y una luz real.
function createCandle(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  const wax = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.04, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: "#efe3c8", roughness: 0.5, emissive: "#ffcf8a", emissiveIntensity: 0.15 }),
  );
  wax.position.y = 0.11;
  group.add(wax);
  const flameGeometry = new THREE.SphereGeometry(0.03, 10, 8);
  flameGeometry.scale(1, 2.4, 1);
  const flame = new THREE.Mesh(flameGeometry, new THREE.MeshBasicMaterial({ color: FLAME_COLOR }));
  flame.position.y = 0.27;
  group.add(flame);
  // La luz va bastante más arriba que la llama: pegada a la cera daría
  // valores enormes y el bloom quemaría toda la imagen.
  const light = new THREE.PointLight("#ffb36b", 2.4, 7, 2);
  light.position.y = 0.6;
  group.add(light);
  return { group, flame, light, tip: position.clone().add(new THREE.Vector3(0, 0.3, 0)) };
}

// Frasco de vidrio con un líquido que brilla apenas.
function createJar(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.11, 0.26, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: "#bfe3ff", transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  glass.position.y = 0.13;
  group.add(glass);
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.1, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: "#2f6b5a", emissive: "#3fbf9a", emissiveIntensity: 0.6, roughness: 0.3 }),
  );
  liquid.position.y = 0.065;
  group.add(liquid);
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.05, 12), new THREE.MeshStandardMaterial({ color: "#8a6a44", roughness: 0.9 }));
  cork.position.y = 0.285;
  group.add(cork);
  return { group, center: position.clone().add(new THREE.Vector3(0, 0.14, 0)) };
}

// Caja abierta con la varita adentro. La varita se levanta cuando la sacás
// de una caja del estante y queda flotando cuando te elige.
function createWandBox(position) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = 0.35;
  const boxMaterial = new THREE.MeshStandardMaterial({ color: "#4a2a22", roughness: 0.8 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.11), boxMaterial);
  base.position.y = 0.025;
  group.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.11), boxMaterial);
  lid.position.set(0, 0.09, -0.08);
  lid.rotation.x = -1.1;
  group.add(lid);

  const wand = new THREE.Group();
  wand.position.y = 0.065;
  const woodMaterial = new THREE.MeshStandardMaterial({ color: "#7a5236", roughness: 0.6 });
  const wood = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, 0.34, 8), woodMaterial);
  wood.rotation.z = Math.PI / 2;
  wand.add(wood);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.013, 0.09, 8), new THREE.MeshStandardMaterial({ color: "#3b2414", roughness: 0.7 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.13;
  wand.add(handle);
  const tipMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), tipMaterial);
  tip.position.x = -0.17;
  wand.add(tip);
  group.add(wand);
  return { group, wand, tip, tipMaterial, woodMaterial };
}

function setupOllivanders(ctx) {
  const { scene, camera, renderer, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.background = new THREE.Color("#140e0a");
  scene.fog = new THREE.FogExp2("#140e0a", 0.06);
  camera.fov = 50;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  const shop = buildShop(ctx);
  scene.add(shop.group);
  const { boxes, boxMesh } = shop;
  boxes.forEach((box, index) => placeBox(boxMesh, box, index));
  boxMesh.instanceMatrix.needsUpdate = true;

  const onCounter = (x) => new THREE.Vector3(x, shop.counterTopY, shop.counterZ);
  const candle = createCandle(onCounter(-0.85));
  const jar = createJar(onCounter(0.8));
  const wandBox = createWandBox(onCounter(0.05));
  scene.add(candle.group, jar.group, wandBox.group);

  const dust = createDust({ count: 260, bounds: new THREE.Box3(new THREE.Vector3(-2.2, 0.4, -2.8), new THREE.Vector3(2.2, 3.6, 2)) });
  scene.add(dust.points);

  // Tres sistemas de partículas: chispas, astillas de vidrio (caen rápido)
  // y humo (sube).
  const sparks = createSparks({ max: 500, size: 0.05 });
  const shards = createSparks({ max: 160, size: 0.035, gravity: -7, drag: 0.6 });
  const smoke = createSparks({ max: 120, size: 0.12, gravity: 0.5, drag: 1.4 });
  scene.add(sparks.points, shards.points, smoke.points);

  scene.add(new THREE.HemisphereLight("#6a7396", "#3a2616", 1.1));
  // Luz cálida de relleno desde donde está la persona: sin ella el frente
  // del mostrador queda negro.
  const fill = new THREE.PointLight("#ffc48a", 5, 0, 2);
  fill.position.set(0.6, 2.4, 3.4);
  scene.add(fill);
  const lamp = new THREE.PointLight("#ffb36b", 24, 0, 2);
  lamp.position.set(0, 3.7, -0.8);
  scene.add(lamp);
  const moon = new THREE.DirectionalLight("#7d8fbf", 0.5);
  moon.position.set(-3, 4, 3);
  scene.add(moon);
  const flare = new THREE.PointLight("#ffd88a", 0, 4, 2);
  flare.position.copy(wandBox.group.position).add(new THREE.Vector3(0, 0.4, 0));
  scene.add(flare);

  const pointer = createPointer(ctx);
  const eased = new THREE.Vector2();
  let hoveredBox = -1;
  const pulled = new Map(); // índice de caja -> segundos que lleva afuera
  const hoverColor = new THREE.Color();

  function boxUnderPointer() {
    const hit = pointer.cast(boxMesh, false)[0];
    return hit ? hit.instanceId : -1;
  }

  function paintBox(index, highlight) {
    if (index < 0) return;
    hoverColor.copy(boxes[index].color);
    if (highlight) hoverColor.lerp(new THREE.Color("#ffd88a"), 0.55);
    boxMesh.setColorAt(index, hoverColor);
    boxMesh.instanceColor.needsUpdate = true;
  }

  // Agitar: con una varita en la mano, mover el puntero de un lado a otro
  // rápido. La varita se inclina con la velocidad del puntero.
  const shaker = createShakeDetector({ onShake: () => props.current.onShake?.() });
  let lastPointerX = null;
  let sway = 0;

  pointer.onMove((event) => {
    if (props.current.heldWand && !props.current.discovered) {
      shaker.feed(event.clientX, event.timeStamp);
      if (lastPointerX !== null) sway = THREE.MathUtils.clamp(sway + (event.clientX - lastPointerX) * 0.01, -0.9, 0.9);
    }
    lastPointerX = event.clientX;
    const next = boxUnderPointer();
    if (next === hoveredBox) return;
    paintBox(hoveredBox, false);
    hoveredBox = next;
    paintBox(hoveredBox, true);
    pointer.setCursor(hoveredBox >= 0 ? "pointer" : "");
  });

  // Tocar una caja la saca del estante y te da otra varita para probar.
  pointer.onTap(() => {
    const index = boxUnderPointer();
    if (index < 0) return;
    pulled.set(index, 0);
    const box = boxes[index];
    smoke.emit(box.position.clone().addScaledVector(box.facing, 0.25), { count: 14, speed: 0.4, color: "#a89a86", intensity: 0.35, lifetime: 1.4 });
    if (!props.current.discovered) props.current.onPickBox?.();
  });

  // Efectos de cada prueba. Cada uno arranca un temporizador que vuelve
  // todo a su lugar.
  let candleOut = 0;
  let jarBroken = 0;
  let shaking = 0;
  let glow = 0;

  const TRIALS = {
    vela() {
      candleOut = 2.6;
      smoke.emit(candle.tip, { count: 40, speed: 0.35, color: "#9a9088", intensity: 0.45, lifetime: 2.2, direction: UP });
    },
    frasco() {
      jarBroken = 2.8;
      jar.group.visible = false;
      shards.emit(jar.center, { count: 120, speed: 3.2, color: "#cfeaff", intensity: 1.3, lifetime: 1.2 });
      sparks.emit(jar.center, { count: 40, speed: 1.4, color: "#3fbf9a", intensity: 1.6, lifetime: 0.9 });
    },
    estante() {
      shaking = 1.3;
      for (let count = 0; count < 14; count += 1) pulled.set(Math.floor(Math.random() * boxes.length), 0);
      smoke.emit(new THREE.Vector3(0, 3.6, -2.4), { count: 50, speed: 1.2, color: "#a89a86", intensity: 0.3, lifetime: 2 });
    },
    chispas() {
      glow = 1.4;
      sparks.emit(wandBox.tip.getWorldPosition(new THREE.Vector3()), { count: 160, speed: 3.4, lifetime: 1.4, direction: UP });
    },
  };

  let lastTrial = props.current.trial?.at ?? 0;
  let wasDiscovered = props.current.discovered;
  let rise = wasDiscovered ? 1 : 0;
  let shownWand = props.current.heldWand ?? null;
  // Puntos de la varita en coordenadas de la caja: adentro y presentada.
  const wandRest = wandBox.wand.position.clone();
  wandBox.group.updateMatrixWorld();
  const wandPresent = wandBox.group.worldToLocal(PRESENT_POINT.clone());
  const wandAt = new THREE.Vector3();
  let wiggle = 0;
  const woodTarget = new THREE.Color("#7a5236");

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.8, radius: 0.5, threshold: 0.82 },
    grade: { warmth: [1.08, 1, 0.86], vignette: 0.6 },
  });

  return {
    composer,
    update({ elapsed, delta, reducedMotion }) {
      const { trial, discovered, house } = props.current;
      // Con prefers-reduced-motion el tiempo animado queda quieto (delta 0):
      // los efectos se resuelven en un solo paso en lugar de congelarse.
      const step = reducedMotion ? 1 : delta;

      // Nueva prueba de varita desde el diálogo.
      if (trial && trial.at !== lastTrial) {
        lastTrial = trial.at;
        wiggle = 1;
        const effect = getWand(trial.wandId)?.trial;
        TRIALS[effect]?.();
      }

      // La varita te eligió: se levanta de la caja y estalla en chispas.
      if (discovered && !wasDiscovered) {
        const color = getHouse(house)?.accent ?? "#ffd88a";
        sparks.emit(wandBox.tip.getWorldPosition(new THREE.Vector3()), { count: 220, speed: 3, lifetime: 1.8, color, direction: UP });
        glow = 2;
      }
      wasDiscovered = discovered;

      if (!reducedMotion) {
        eased.lerp(pointer.state.inside ? pointer.ndc : CENTER, 1 - Math.exp(-delta * 3));
        camera.position.set(CAMERA_POSITION.x + eased.x * 0.35, CAMERA_POSITION.y + eased.y * 0.15, CAMERA_POSITION.z);
        if (shaking > 0) {
          camera.position.x += (Math.random() - 0.5) * 0.04 * shaking;
          camera.position.y += (Math.random() - 0.5) * 0.03 * shaking;
        }
        camera.lookAt(CAMERA_TARGET);
      }

      // Cajas: las que se sacaron vuelven solas después de un rato; con el
      // estante temblando, todas vibran.
      if (pulled.size > 0 || shaking > 0) {
        if (shaking > 0) boxes.forEach((box, index) => placeBox(boxMesh, box, index, 0, 0.012 * shaking));
        pulled.forEach((time, index) => {
          const next = time + step;
          const pull = next < 1.6 ? Math.min(next * 2, 1) * 0.22 : Math.max(0, 1 - (next - 1.6) * 2) * 0.22;
          placeBox(boxMesh, boxes[index], index, pull);
          if (next > 2.2) {
            pulled.delete(index);
            placeBox(boxMesh, boxes[index], index);
          } else {
            pulled.set(index, next);
          }
        });
        if (shaking > 0) {
          shaking = Math.max(0, shaking - step);
          if (shaking === 0) boxes.forEach((box, index) => placeBox(boxMesh, box, index));
        }
        boxMesh.instanceMatrix.needsUpdate = true;
      }

      // Vela: se apaga y vuelve a prenderse con una chispa.
      if (candleOut > 0) {
        candleOut = Math.max(0, candleOut - step);
        if (candleOut === 0) sparks.emit(candle.tip, { count: 12, speed: 0.6, lifetime: 0.5 });
      }
      const flicker = 1 + Math.sin(elapsed * 11) * 0.12 + Math.sin(elapsed * 17.3) * 0.07;
      const lit = candleOut > 0 ? 0 : 1;
      candle.flame.scale.setScalar(damp(candle.flame.scale.x, lit * flicker, 14, delta || 1));
      candle.light.intensity = 2.4 * candle.flame.scale.x;

      // Frasco: después de romperse se arma de nuevo (Reparo).
      if (jarBroken > 0) {
        jarBroken = Math.max(0, jarBroken - step);
        if (jarBroken === 0) {
          jar.group.visible = true;
          jar.group.scale.setScalar(0.01);
          sparks.emit(jar.center, { count: 30, speed: 0.8, color: "#bfe3ff", lifetime: 0.6 });
        }
      }
      if (jar.group.visible) jar.group.scale.setScalar(damp(jar.group.scale.x, 1, 6, delta || 1));

      // Varita elegida: sube, gira despacio y la punta queda encendida.
      // Otra varita en la mano: vuelve a la caja y sube de nuevo, con su madera.
      const { heldWand } = props.current;
      if (heldWand !== shownWand) {
        shownWand = heldWand;
        rise = 0;
        const wood = getWand(heldWand)?.woodColor;
        if (wood) woodTarget.set(wood);
        smoke.emit(wandBox.group.position.clone().add(new THREE.Vector3(0, 0.1, 0)), { count: 20, speed: 0.5, color: "#a89a86", intensity: 0.35, lifetime: 1.2 });
      }
      wandBox.woodMaterial.color.lerp(woodTarget, Math.min(1, step * 4));
      rise = damp(rise, discovered || heldWand ? 1 : 0, 2.5, delta || 1);
      wandAt.lerpVectors(wandRest, wandPresent, rise);
      wandAt.y += rise * Math.sin(elapsed * 1.6) * 0.02;
      wandBox.wand.position.copy(wandAt);
      wandBox.wand.scale.setScalar(1 + rise * 0.6);
      wandBox.wand.rotation.y = rise * elapsed * 0.6;
      sway = damp(sway, 0, 4, delta || 1);
      wiggle = Math.max(0, wiggle - step * 1.5);
      wandBox.wand.rotation.z = rise * (sway * 0.6 + Math.sin(elapsed * 40) * 0.25 * wiggle);
      glow = Math.max(discovered ? 0.6 : heldWand ? 0.25 : 0, glow - step * 0.8);
      wandBox.tip.getWorldPosition(flare.position);
      flare.intensity = glow * 4;
      wandBox.tipMaterial.color.copy(FLAME_COLOR).multiplyScalar(Math.min(glow, 1.2));

      dust.update(elapsed, delta);
      sparks.update(step);
      shards.update(step);
      smoke.update(step);
      lamp.intensity = 24 * (1 + Math.sin(elapsed * 5.3) * 0.03);
    },
  };
}

export default function Ollivanders({ place, discovered, trial, house, heldWand, onPickBox, onShake }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupOllivanders, { place, discovered, trial, house, heldWand, onPickBox, onShake }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="Ollivanders: una tienda angosta con miles de cajas de varitas en los estantes, una vela y un frasco sobre el mostrador"
    />
  );
}
