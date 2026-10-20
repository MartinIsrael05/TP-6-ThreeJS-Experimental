"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildDoor } from "@/components/scenes/camara/door";
import { playSfx } from "@/lib/audio/sfx";
import { createPbrMaterial } from "@/lib/three/pbrTextures";
import { createPointer, damp, easeInOut } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

const CAMERA_POSITION = new THREE.Vector3(0, 2.4, 8.2);
const DOOR_CENTER = new THREE.Vector3(0, 2.7, 0);
const CAMERA_TARGET = new THREE.Vector3(0, 2.4, 0);
// Pársel: la puerta sisea un patrón de siseos cortos ("c") y largos ("l")
// y hay que repetirlo siseando. Primero tres siseos, después cuatro.
const ROUND_LENGTHS = [3, 4];
const SHORT_SECONDS = 0.35;
const LONG_SECONDS = 1.05;
const GAP_SECONDS = 0.45;
// Desde cuántos segundos tu siseo cuenta como largo, y debajo de cuántos es
// ruido y no cuenta.
const LONG_FROM = 0.6;
const MIN_HISS = 0.12;
const OPEN_SECONDS = 2.6;
const EYE_IDLE = new THREE.Color(0.2, 0.9, 0.4);
const EYE_LIT = new THREE.Color(1.2, 4, 1.8);
const EYE_WRONG = new THREE.Color(4, 0.5, 0.3);
const FIRE = new THREE.Color(0.6, 2.6, 1.2);

// Brasero con fuego verde: cuenco, llama con bloom y una luz.
function createBrazier(x) {
  const group = new THREE.Group();
  group.position.set(x, 0, 1.6);
  const metal = new THREE.MeshStandardMaterial({ color: "#2a2f2c", metalness: 0.8, roughness: 0.4 });
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 10), metal);
  stand.position.y = 0.55;
  group.add(stand);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.2, 0.22, 16), metal);
  bowl.position.y = 1.2;
  group.add(bowl);
  const flameGeometry = new THREE.ConeGeometry(0.22, 0.6, 12);
  const flame = new THREE.Mesh(flameGeometry, new THREE.MeshBasicMaterial({ color: FIRE }));
  flame.position.y = 1.6;
  group.add(flame);
  const light = new THREE.PointLight("#5dff9a", 9, 9, 2);
  light.position.y = 1.8;
  group.add(light);
  return { group, flame, light };
}

function setupChamber(ctx) {
  const { scene, camera, renderer, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color("#030605");
  scene.fog = new THREE.FogExp2("#041009", 0.07);
  camera.fov = 50;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  const stone = createPbrMaterial(ctx, { folder: "gran-comedor", name: "medieval_blocks_03", repeat: [5, 3], color: "#2c332e", tint: "#7f8a80" });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), stone);
  wall.position.set(0, 4.5, -0.25);
  scene.add(wall);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 14),
    new THREE.MeshStandardMaterial({ color: "#0b1410", roughness: 0.15, metalness: 0.5 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 6;
  scene.add(floor);

  // Columnas con una cabeza de serpiente arriba, a los dos lados.
  const columnMaterial = createPbrMaterial(ctx, { folder: "gran-comedor", name: "medieval_blocks_03", repeat: [1, 3], color: "#2c332e", tint: "#7f8a80" });
  [-4.6, 4.6].forEach((x) => {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 8, 16), columnMaterial);
    column.position.set(x, 4, 0.8);
    scene.add(column);
  });

  // Detrás de la puerta: una luz verde que se ve cuando se abre.
  const behind = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.6, 0.3) }));
  behind.position.set(DOOR_CENTER.x, DOOR_CENTER.y, -0.2);
  scene.add(behind);

  const door = buildDoor();
  const doorGroup = new THREE.Group();
  doorGroup.position.copy(DOOR_CENTER);
  door.halves.forEach((half) => doorGroup.add(half.group));
  doorGroup.add(door.center);
  scene.add(doorGroup);

  const braziers = [-3.2, 3.2].map(createBrazier);
  braziers.forEach((brazier) => scene.add(brazier.group));

  const sparks = createSparks({ max: 500, size: 0.12, gravity: 0.4 });
  scene.add(sparks.points);
  scene.add(new THREE.HemisphereLight("#3a5e4a", "#020403", 0.7));
  const glow = new THREE.PointLight("#5dff9a", 0, 14, 1.6);
  glow.position.set(0, 2.7, 1);
  scene.add(glow);

  // Patrones al azar, con por lo menos un siseo de cada largo.
  function makePattern(length) {
    let pattern = [];
    while (!pattern.includes("c") || !pattern.includes("l")) {
      pattern = Array.from({ length }, () => (Math.random() < 0.5 ? "c" : "l"));
    }
    return pattern;
  }
  const patterns = ROUND_LENGTHS.map(makePattern);
  // Cuándo empieza cada siseo de la puerta, en segundos desde que arranca.
  const schedules = patterns.map((pattern) => {
    let at = 0;
    return pattern.map((symbol) => {
      const duration = symbol === "l" ? LONG_SECONDS : SHORT_SECONDS;
      const entry = { at, duration };
      at += duration + GAP_SECONDS;
      return entry;
    });
  });

  let round = 0;
  let input = 0;
  let mode = props.current.discovered ? "open" : "wait"; // wait | play | input | wrong | opening | open
  let clock = props.current.discovered ? OPEN_SECONDS : -1.6; // espera antes de la primera ronda
  let played = 0;
  let openedByPlaying = false;
  // Segundos reales (no del reloj de la escena, que se frena si los cuadros
  // tardan) en que empezó tu siseo, o -1.
  let hissStart = -1;
  let lastReplay = props.current.replayAt ?? 0;
  const flashes = door.snakes.map(() => 0);
  const holds = door.snakes.map(() => 0);
  const matched = door.snakes.map(() => false);
  let wrongFlash = 0;

  // Le cuenta al panel en qué va el juego (solo cuando algo cambia).
  let reported = "";
  function report() {
    const state = { mode, round, rounds: patterns.length, pattern: patterns[round] ?? patterns.at(-1), input };
    const key = JSON.stringify(state);
    if (key === reported) return;
    reported = key;
    props.current.onParselState?.(state);
  }

  function startRound() {
    mode = "play";
    clock = 0;
    played = 0;
    input = 0;
    hissStart = -1;
    matched.fill(false);
    report();
  }

  function open(byPlaying) {
    mode = "opening";
    clock = 0;
    openedByPlaying = byPlaying;
    playSfx("door");
    sparks.emit(DOOR_CENTER.clone().setZ(0.4), { count: 200, speed: 3, color: "#5dff9a", lifetime: 1.6 });
    report();
  }

  // Terminó tu siseo: se compara su largo con el de la puerta.
  function judge(duration) {
    if (duration < MIN_HISS) return;
    const symbol = duration >= LONG_FROM ? "l" : "c";
    const pattern = patterns[round];
    if (symbol !== pattern[input]) {
      mode = "wrong";
      clock = 0;
      wrongFlash = 1;
      playSfx("error");
      report();
      return;
    }
    matched[input] = true;
    flashes[input] = 1;
    input += 1;
    if (input < pattern.length) {
      report();
      return;
    }
    round += 1;
    playSfx("align", { step: round * 3 });
    if (round === patterns.length) open(true);
    else {
      mode = "wait";
      clock = -1.2;
      report();
    }
  }

  // Tocar el centro de la puerta la hace sisear otra vez.
  const pointer = createPointer(ctx);
  pointer.onMove(() => {
    const canReplay = mode === "input" || mode === "wait";
    pointer.setCursor(canReplay && pointer.cast(door.center, false).length > 0 ? "pointer" : "");
  });
  pointer.onTap(() => {
    if (props.current.casting || (mode !== "input" && mode !== "wait")) return;
    if (pointer.cast(door.center, false).length > 0) startRound();
  });

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 1, radius: 0.6, threshold: 0.78 },
    grade: { warmth: [0.9, 1.06, 0.94], vignette: 0.7 },
  });

  return {
    composer,
    update({ elapsed, delta, reducedMotion }) {
      const step = reducedMotion ? 1 / 30 : delta;
      clock += step;

      // Pársel desde el botón: la puerta se abre sin juego.
      if (props.current.casting && mode !== "opening" && mode !== "open") open(false);
      // "Volver a escuchar" desde el panel.
      const replayAt = props.current.replayAt ?? 0;
      if (replayAt !== lastReplay) {
        lastReplay = replayAt;
        if (mode === "input" || mode === "wait") startRound();
      }
      if (mode === "wait" && clock >= 0) startRound();

      // La puerta sisea su patrón: cada serpiente se enciende mientras dura
      // su siseo.
      if (mode === "play") {
        const schedule = schedules[round];
        while (played < schedule.length && clock >= schedule[played].at) {
          const { duration } = schedule[played];
          const snake = door.snakes[played];
          playSfx("parsel", { duration, pitch: snake.pitch, pan: snake.pan });
          holds[played] = duration;
          played += 1;
        }
        const last = schedule.at(-1);
        // Un respiro antes de escucharte, para no tomar el eco de la puerta.
        if (clock >= last.at + last.duration + 0.5) {
          mode = "input";
          report();
        }
      }
      if (mode === "wrong" && clock > 1.4) startRound();

      // Tu siseo (micrófono, barra espaciadora o botón): se mide cuánto dura.
      const hissing = Boolean(props.current.hissRef?.current?.active);
      const now = performance.now() / 1000;
      if (mode === "input") {
        if (hissing && hissStart < 0) hissStart = now;
        // La serpiente que toca se va encendiendo mientras siseás.
        if (hissing && input < door.snakes.length) {
          flashes[input] = 0.35 + Math.min(1, (now - hissStart) / LONG_FROM) * 0.65;
        }
        if (!hissing && hissStart >= 0) {
          const duration = now - hissStart;
          hissStart = -1;
          judge(duration);
        }
      } else {
        hissStart = -1;
      }

      if (mode === "opening") {
        const t = easeInOut(clock / OPEN_SECONDS);
        door.halves.forEach(({ group, side }) => {
          group.position.x = side * t * 2.9;
          group.rotation.z = side * -t * 0.5;
        });
        door.center.scale.setScalar(1 - t);
        if (clock >= OPEN_SECONDS) {
          mode = "open";
          if (openedByPlaying) props.current.onSolve();
        }
      } else if (mode === "open") {
        door.halves.forEach(({ group, side }) => {
          group.position.x = side * 2.9;
          group.rotation.z = side * -0.5;
        });
        door.center.scale.setScalar(0.001);
      }
      const opened = mode === "opening" ? easeInOut(clock / OPEN_SECONDS) : mode === "open" ? 1 : 0;
      glow.intensity = opened * 26;

      // Ojos: se encienden con cada siseo; rojos si te equivocaste.
      wrongFlash = Math.max(0, wrongFlash - step * 1.4);
      door.snakes.forEach((snake, index) => {
        if (holds[index] > 0) {
          holds[index] = Math.max(0, holds[index] - step);
          flashes[index] = 1;
        } else if (matched[index]) {
          flashes[index] = Math.max(flashes[index] - step, 0.7);
        } else if (!(mode === "input" && index === input && hissStart >= 0)) {
          flashes[index] = Math.max(0, flashes[index] - step * 2.2);
        }
        snake.eyeMaterial.color.copy(EYE_IDLE).lerp(EYE_LIT, flashes[index]).lerp(EYE_WRONG, wrongFlash);
        snake.group.children[0].material.emissiveIntensity = 0.12 + flashes[index] * 0.8;
        snake.group.position.z = flashes[index] * 0.08;
      });
      door.centerMaterial.emissiveIntensity = mode === "input" || mode === "wait" ? 0.25 + Math.sin(elapsed * 3) * 0.12 : 0.1;

      braziers.forEach(({ flame, light }, index) => {
        const flicker = 1 + Math.sin(elapsed * 10 + index * 2) * 0.12 + Math.sin(elapsed * 17 + index) * 0.08;
        flame.scale.set(flicker, flicker * (1.1 + Math.sin(elapsed * 6 + index) * 0.15), flicker);
        light.intensity = damp(light.intensity, 9 * flicker, 10, delta || 1);
        if (!reducedMotion && Math.random() < 0.3) {
          sparks.emit(flame.getWorldPosition(new THREE.Vector3()), { count: 1, speed: 0.4, color: "#5dff9a", intensity: 0.8, lifetime: 1.2 });
        }
      });
      sparks.update(reducedMotion ? 1 : step);

      if (!reducedMotion) {
        camera.position.set(CAMERA_POSITION.x + pointer.ndc.x * 0.3, CAMERA_POSITION.y + pointer.ndc.y * 0.15, CAMERA_POSITION.z - opened * 1.2);
        camera.lookAt(CAMERA_TARGET);
      }
    },
  };
}

export default function Chamber({ place, discovered, casting, onSolve, hissRef, replayAt, onParselState }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupChamber, { place, discovered, casting, onSolve, hissRef, replayAt, onParselState }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="La entrada a la Cámara de los Secretos: una puerta redonda de piedra con seis serpientes de ojos verdes, entre dos braseros de fuego verde"
    />
  );
}
