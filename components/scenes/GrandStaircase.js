"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildFlight, buildLanding, buildTower, landingPosition, stoneMaterial, TOWER } from "@/components/scenes/escaleras/tower";
import { playSfx } from "@/lib/audio/sfx";
import { createDiaryPage } from "@/lib/three/diaryPage";
import { createPointer, damp, easeInOut } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

// Cuartos de vuelta que le faltan a cada tramo al empezar: ninguno arranca
// bien puesto y cada uno necesita una cantidad distinta de toques.
const START_TURNS = [1, 2, 3];
const QUARTER = Math.PI / 2;
const TURN_SECONDS = 0.7;
const SOLVE_SECONDS = 1.8;
const LOOK_AT = new THREE.Vector3(0, 4.3, 0);
const CENTER = new THREE.Vector2();
const RUNE_WRONG = new THREE.Color(2, 0.5, 0.25);
const RUNE_RIGHT = new THREE.Color(0.4, 2, 0.8);

function setupStaircase(ctx) {
  const { scene, camera, renderer, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color("#120d0a");
  scene.fog = new THREE.FogExp2("#120d0a", 0.03);
  camera.fov = 45;

  const tower = buildTower(ctx);
  scene.add(tower.group);
  const landingMaterial = stoneMaterial(ctx, [0.8, 0.8]);
  for (let level = 0; level < TOWER.levels; level += 1) scene.add(buildLanding(landingMaterial, level));

  // Tramos: el par sube hacia +X y el impar hacia -X (media vuelta).
  const solvedAtStart = props.current.discovered;
  const flights = [0, 1, 2].map((index) => {
    const built = buildFlight(ctx, index);
    const correct = index % 2 ? Math.PI : 0;
    const turns = solvedAtStart ? 0 : START_TURNS[index];
    const angle = correct + turns * QUARTER;
    built.group.position.set(0, TOWER.levelHeight * (index + 0.5), 0);
    built.group.rotation.y = angle;
    built.group.traverse((object) => {
      object.userData.flight = index;
    });
    scene.add(built.group);
    return { ...built, index, turns, from: angle, to: angle, t: 1, duration: TURN_SECONDS, glow: 0 };
  });
  if (solvedAtStart) flights.forEach((flight) => flight.runeMaterial.color.copy(RUNE_RIGHT));

  // La página espera en el último descanso.
  const { page, material: pageMaterial } = createDiaryPage();
  const pageHome = landingPosition(TOWER.levels - 1).add(new THREE.Vector3(0, 1.1, 0));
  page.position.copy(pageHome);
  scene.add(page);
  const pageLight = new THREE.PointLight("#ffd88a", 0, 6, 2);
  pageLight.position.copy(pageHome);
  scene.add(pageLight);

  const sparks = createSparks({ max: 600, size: 0.14 });
  const dust = createSparks({ max: 200, size: 0.2, gravity: -0.3, drag: 1.5 });
  scene.add(sparks.points, dust.points);

  scene.add(new THREE.HemisphereLight("#4a5a86", "#2a1a10", 0.55));
  const moon = new THREE.DirectionalLight("#8ea0d0", 0.6);
  moon.position.set(2, 20, 4);
  scene.add(moon);

  const pointer = createPointer(ctx);
  const eased = new THREE.Vector2();
  let hovered = -1;
  let shake = 0;
  let solved = solvedAtStart;
  let solving = -1; // segundos desde que se alineó todo, o -1
  let solvedByPlaying = false;
  let path = [];

  const isAligned = (flight) => flight.turns === 0 && flight.t >= 1;

  function flightUnderPointer() {
    const hit = pointer.cast(flights.map((flight) => flight.group))[0];
    return hit ? hit.object.userData.flight : -1;
  }

  // Si el tramo todavía está girando, el nuevo giro parte de donde iba a
  // quedar, no de donde está: así nunca termina torcido.
  function turn(flight, quarters, delay = 0) {
    const base = flight.t < 1 ? flight.to : flight.group.rotation.y;
    flight.from = flight.group.rotation.y;
    flight.to = base + quarters * QUARTER;
    flight.turns = (flight.turns + quarters) % 4;
    flight.duration = TURN_SECONDS * Math.max(1, quarters * 0.6);
    flight.t = -delay / flight.duration;
    if (delay === 0) startTurnEffects(flight);
  }

  function startTurnEffects(flight) {
    playSfx("stone");
    shake = 0.5;
    dust.emit(flight.group.position, { count: 30, speed: 1.6, color: "#a89a86", intensity: 0.3, lifetime: 1.4 });
  }

  // Recorrido de luz: descanso, tramo, descanso... de abajo hacia arriba.
  function buildPath() {
    const points = [];
    const local = new THREE.Vector3();
    flights.forEach((flight) => {
      points.push(landingPosition(flight.index).add(new THREE.Vector3(0, 0.3, 0)));
      for (let sample = 0; sample <= 6; sample += 1) {
        const t = sample / 6;
        local.set(-TOWER.flightRun / 2 + t * TOWER.flightRun, -TOWER.levelHeight / 2 + t * TOWER.levelHeight + 0.35, 0);
        points.push(flight.group.localToWorld(local.clone()));
      }
    });
    points.push(pageHome.clone());
    return points;
  }

  function finishTurn(flight) {
    if (flight.turns !== 0) return;
    const alignedCount = flights.filter(isAligned).length;
    playSfx("align", { step: alignedCount * 2 });
    sparks.emit(flight.rune.getWorldPosition(new THREE.Vector3()), { count: 40, speed: 1.5, color: "#7dffb0", lifetime: 0.8 });
    if (alignedCount === flights.length && !solved && solving < 0) {
      solving = 0;
      path = buildPath();
    }
  }

  pointer.onMove(() => {
    hovered = solved || solving >= 0 ? -1 : flightUnderPointer();
    pointer.setCursor(hovered >= 0 ? "pointer" : "");
  });

  pointer.onTap(() => {
    if (solved || solving >= 0 || props.current.casting) return;
    const index = flightUnderPointer();
    if (index < 0 || flights[index].t < 1) return;
    solvedByPlaying = true;
    turn(flights[index], 1);
  });

  // Alohomora desde el botón: cada tramo gira solo hasta su lugar, uno
  // detrás del otro.
  let castHandled = false;

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.85, radius: 0.5, threshold: 0.82 },
    grade: { warmth: [1.04, 1, 0.92], vignette: 0.55 },
  });

  // La cámara se aleja lo necesario para que entre la torre entera, también
  // en pantallas angostas.
  let distance = 16;
  const halfFov = THREE.MathUtils.degToRad(45 / 2);

  return {
    composer,
    resize(width, height) {
      const aspect = width / height;
      distance = Math.max(17, 6.4 / (Math.tan(halfFov) * aspect));
    },
    update({ elapsed, delta, reducedMotion }) {
      const step = reducedMotion ? 1 : delta;

      if (props.current.casting && !castHandled && !solved) {
        castHandled = true;
        solvedByPlaying = false;
        let delay = 0;
        flights.forEach((flight) => {
          if (flight.turns === 0) return;
          turn(flight, 4 - flight.turns, delay);
          delay += 0.35;
        });
      }

      flights.forEach((flight) => {
        if (flight.t < 1) {
          const before = flight.t;
          flight.t += step / flight.duration;
          if (before < 0 && flight.t >= 0) startTurnEffects(flight);
          const progress = easeInOut(Math.max(flight.t, 0));
          flight.group.rotation.y = flight.from + (flight.to - flight.from) * progress;
          if (flight.t >= 1) {
            flight.group.rotation.y = flight.to;
            finishTurn(flight);
          }
        }
        const target = flight.index === hovered ? 0.35 : solved ? 0.12 : 0;
        flight.glow = damp(flight.glow, target, 8, step);
        flight.material.emissiveIntensity = flight.glow;
        flight.runeMaterial.color.lerp(isAligned(flight) ? RUNE_RIGHT : RUNE_WRONG, Math.min(1, step * 5));
        // La runa siempre mira a la cámara.
        flight.rune.quaternion.copy(flight.group.quaternion).invert().multiply(camera.quaternion);
      });

      // Camino resuelto: una estela de luz sube de descanso en descanso.
      if (solving >= 0) {
        const before = solving;
        solving += step;
        const from = Math.floor((before / SOLVE_SECONDS) * path.length);
        const to = Math.min(path.length, Math.floor((solving / SOLVE_SECONDS) * path.length));
        for (let index = from; index < to; index += 1) sparks.emit(path[index], { count: 18, speed: 0.9, lifetime: 1 });
        if (solving >= SOLVE_SECONDS) {
          solving = -1;
          solved = true;
          sparks.emit(pageHome, { count: 140, speed: 3, lifetime: 1.4 });
          if (solvedByPlaying) props.current.onSolve();
        }
      }

      // Página: flota, gira y brilla cuando el camino está armado.
      page.position.y = pageHome.y + Math.sin(elapsed * 1.4) * 0.08;
      page.rotation.y = elapsed * 0.7;
      const pageGlow = solved || props.current.discovered ? 0.9 : 0.12;
      pageMaterial.emissiveIntensity = damp(pageMaterial.emissiveIntensity, pageGlow, 3, step);
      pageLight.intensity = pageMaterial.emissiveIntensity * 8;

      tower.portraits.forEach(({ paint, phase }) => {
        paint.emissiveIntensity = 0.04 + Math.max(0, Math.sin(elapsed * 0.5 + phase)) * 0.08;
      });
      tower.torches.forEach(({ flame, light, phase }) => {
        const flicker = 1 + Math.sin(elapsed * 9 + phase) * 0.1 + Math.sin(elapsed * 15.7 + phase) * 0.06;
        flame.scale.setScalar(flicker);
        light.intensity = 16 * flicker;
      });

      if (!reducedMotion) eased.lerp(pointer.state.inside ? pointer.ndc : CENTER, 1 - Math.exp(-delta * 3));
      camera.position.set(eased.x * 1.2, 7.8 + eased.y * 0.6, distance);
      if (shake > 0 && !reducedMotion) {
        camera.position.x += (Math.random() - 0.5) * 0.12 * shake;
        camera.position.y += (Math.random() - 0.5) * 0.1 * shake;
        shake = Math.max(0, shake - delta * 1.5);
      }
      camera.lookAt(LOOK_AT);

      sparks.update(step);
      dust.update(step);
    },
  };
}

export default function GrandStaircase({ place, discovered, casting, onSolve }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupStaircase, { place, discovered, casting, onSolve }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="La torre de las escaleras giratorias: tres tramos de piedra entre cuatro descansos, con retratos y antorchas en la pared"
    />
  );
}
