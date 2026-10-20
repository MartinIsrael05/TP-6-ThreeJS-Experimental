"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { getHouse, houses } from "@/data/houses";
import { useThreeScene } from "@/hooks/useThreeScene";
import { createAnswerCards } from "@/components/scenes/great-hall/answerCards";
import { createCandles } from "@/components/scenes/great-hall/candles";
import { createDust } from "@/components/scenes/great-hall/dust";
import { createEnchantedCeiling } from "@/components/scenes/great-hall/enchantedCeiling";
import { buildHall, HALL } from "@/components/scenes/great-hall/hall";
import { createSortingHat } from "@/components/scenes/great-hall/sortingHat";
import { playSfx } from "@/lib/audio/sfx";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

const FOG_COLOR = "#1b130d";
const CAMERA_POSITION = new THREE.Vector3(0, 2.6, -9);
const CAMERA_TARGET = new THREE.Vector3(0, 2.1, -30);
// Cuánto se corre la cámara con el puntero (paralaje), en metros.
const PARALLAX = new THREE.Vector2(0.45, 0.22);
const UP = new THREE.Vector3(0, 1, 0);

// Luces reales: pocas y cálidas. El resto de la luz lo dan las velas con
// emissive y bloom.
const DEFAULT_BANNER_COLORS = houses.map((house) => new THREE.Color(house.color));
// Cuánto se tiñen las llamas con el color de la casa (0 a 1).
const FLAME_TINT = 0.22;

const LIGHTS = [
  { position: [-2.6, 5.4, -3], intensity: 26 },
  { position: [2.6, 6.3, -13], intensity: 24 },
  { position: [-2.6, 6.3, -22], intensity: 24 },
  { position: [0, 4.2, -30], intensity: 70 },
];

function setupGreatHall(ctx) {
  const { scene, camera, renderer, listen, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.036);

  camera.fov = 50;
  camera.near = 0.1;
  camera.far = 80;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  const { group: hall, bannerMaterials, wood } = buildHall(
    ctx,
    houses.map((house) => house.color),
  );
  scene.add(hall);

  const sortingHat = createSortingHat({
    position: new THREE.Vector3(0, 0, HALL.tablesTo - 2.5),
    stoolMaterial: wood,
  });
  scene.add(sortingHat.group);

  const ceiling = createEnchantedCeiling(HALL);
  scene.add(ceiling.mesh);

  const candles = createCandles({
    count: 150,
    bounds: new THREE.Box3(new THREE.Vector3(-5.8, 4.4, HALL.back + 5), new THREE.Vector3(5.8, 7.4, HALL.front - 2)),
    avoid: { point: CAMERA_POSITION, radius: 3 },
  });
  candles.meshes.forEach((mesh) => scene.add(mesh));

  const dust = createDust({
    count: 380,
    bounds: new THREE.Box3(new THREE.Vector3(-4.5, 0.6, -24), new THREE.Vector3(4.5, 6, -10)),
  });
  scene.add(dust.points);

  scene.add(new THREE.HemisphereLight("#46557f", "#2a1a10", 0.6));
  const lights = LIGHTS.map(({ position, intensity }) => {
    const light = new THREE.PointLight("#ffb36b", intensity, 0, 2);
    light.position.set(...position);
    light.userData.base = intensity;
    scene.add(light);
    return light;
  });

  // Puntero en coordenadas normalizadas (de -1 a 1). Sirve para el paralaje
  // (la cámara se corre apenas y sigue mirando al mismo punto) y para el
  // raycasting del Sombrero.
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  let hovered = false;
  let hoveredCard = -1;

  function readPointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  // El Sombrero solo responde mientras el ítem no está conseguido y
  // todavía no empezó a preguntar.
  function pointsAtHat() {
    if (props.current.discovered || props.current.sortingPhase) return false;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(sortingHat.hitArea).length > 0;
  }

  // Las respuestas del Sombrero flotan entre la cámara y el Sombrero.
  const hatTip = sortingHat.group.position.clone().add(new THREE.Vector3(0, 1.4, 0));
  const cards = createAnswerCards({ hatPosition: hatTip });
  scene.add(cards.group);
  let shownQuestion = null;

  function cardUnderPointer() {
    if (props.current.sortingPhase !== "asking" || cards.isBusy()) return -1;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(cards.meshes, false)[0];
    return hit && hit.object.material.opacity > 0.5 ? hit.object.userData.card : -1;
  }

  listen(renderer.domElement, "pointermove", (event) => {
    readPointer(event);
    hovered = pointsAtHat();
    hoveredCard = cardUnderPointer();
    renderer.domElement.style.cursor = hovered || hoveredCard >= 0 ? "pointer" : "";
  });
  listen(renderer.domElement, "pointerleave", () => {
    pointer.set(0, 0);
    hovered = false;
    hoveredCard = -1;
  });
  // Chispas que salen del Sombrero al tocarlo, con cada respuesta y cuando
  // anuncia la casa.
  const sparks = createSparks({ max: 300, size: 0.12 });
  scene.add(sparks.points);
  let shownPhase = props.current.sortingPhase;

  function pickCard(index) {
    const answerId = cards.pick(index);
    if (!answerId) return;
    hoveredCard = -1;
    props.current.onPickAnswer?.(answerId);
  }

  // Tocar el Sombrero empieza la selección (lo mismo que el botón
  // "Ponerme el Sombrero"); tocar un pergamino lo elige.
  listen(renderer.domElement, "click", (event) => {
    readPointer(event);
    const card = cardUnderPointer();
    if (card >= 0) {
      pickCard(card);
      return;
    }
    if (!pointsAtHat()) return;
    sparks.emit(hatTip, { count: 50, speed: 2.2 });
    playSfx("spell");
    props.current.onDiscover();
  });

  // Colores de la casa: los estandartes pasan todos a su color y las llamas
  // se tiñen apenas. Sin casa, cada estandarte tiene el de una casa.
  let appliedHouse;
  const bannerTargets = DEFAULT_BANNER_COLORS.map((color) => color.clone());
  function applyHouse(houseId) {
    appliedHouse = houseId;
    const house = houseId ? getHouse(houseId) : null;
    bannerTargets.forEach((target, index) => target.copy(house ? new THREE.Color(house.color) : DEFAULT_BANNER_COLORS[index]));
    candles.setTint(house?.accent, FLAME_TINT);
  }

  // Bloom suave para llamas y estrellas, corrección cálida y viñeta. Si el
  // equipo no llega a 40 FPS, useThreeScene lo apaga solo.
  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.75, radius: 0.55, threshold: 0.85 },
    grade: { warmth: [1.05, 1, 0.9], vignette: 0.5 },
  });

  return {
    composer,
    resize(width, height) {
      cards.layout(width / height);
    },
    update({ elapsed, delta, reducedMotion }) {
      if (!reducedMotion) {
        eased.lerp(pointer, 1 - Math.exp(-delta * 3));
        camera.position.set(
          CAMERA_POSITION.x + eased.x * PARALLAX.x,
          CAMERA_POSITION.y + eased.y * PARALLAX.y,
          CAMERA_POSITION.z,
        );
        camera.lookAt(CAMERA_TARGET);
      }

      if (props.current.house !== appliedHouse) applyHouse(props.current.house ?? null);
      // Pregunta nueva: los pergaminos cambian cuando termina de volar el
      // anterior. Cuando el Sombrero anuncia la casa, festeja con chispas
      // de su color.
      const { sortingQuestion, sortingPhase } = props.current;
      if ((sortingQuestion?.id ?? null) !== shownQuestion && !cards.isBusy()) {
        shownQuestion = sortingQuestion?.id ?? null;
        cards.setQuestion(sortingQuestion ?? null);
      }
      if (sortingPhase !== shownPhase) {
        if (sortingPhase === "revealed" && appliedHouse) {
          sparks.emit(hatTip, { count: 160, speed: 4, color: getHouse(appliedHouse).accent, lifetime: 1.6, direction: UP });
        }
        shownPhase = sortingPhase;
      }
      const ready = cards.update({ elapsed, delta: reducedMotion ? 1 / 30 : delta, hovered: hoveredCard });
      if (ready >= 0) pickCard(ready);
      // Mientras piensa, el Sombrero se sacude.
      sortingHat.group.rotation.z = sortingPhase === "thinking" && !reducedMotion ? Math.sin(elapsed * 14) * 0.06 : 0;
      const blend = delta > 0 ? 1 - Math.exp(-delta * 2.5) : 1;
      bannerMaterials.forEach((material, index) => material.color.lerp(bannerTargets[index], blend));

      ceiling.update(elapsed);
      candles.update(elapsed, delta);
      dust.update(elapsed, delta);
      sparks.update(reducedMotion ? 1 : delta);
      sortingHat.update({ elapsed, delta, highlight: hovered || sortingPhase === "thinking" ? 1 : 0, idle: !props.current.discovered });

      // Titileo de las luces: dos senos desfasados por luz, sin azar por
      // frame para que no parpadee.
      lights.forEach((light, index) => {
        const flicker = Math.sin(elapsed * 7.1 + index * 1.7) * 0.06 + Math.sin(elapsed * 13.3 + index) * 0.04;
        light.intensity = light.userData.base * (1 + flicker);
      });
    },
  };
}

export default function GreatHall({ place, discovered, onDiscover, house, sortingQuestion, sortingPhase, onPickAnswer }) {
  const mountRef = useRef(null);
  useThreeScene(
    mountRef,
    setupGreatHall,
    { place, discovered, onDiscover, house, sortingQuestion, sortingPhase, onPickAnswer },
    place.id,
  );

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="El Gran Comedor: cuatro mesas largas bajo velas flotantes y la mesa de profesores al fondo"
    />
  );
}
