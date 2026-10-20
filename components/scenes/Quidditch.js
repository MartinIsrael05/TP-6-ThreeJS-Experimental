"use client"; // Escena Three.js: necesita WebGL, el DOM, Web Audio y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildPitch, MOON_DIRECTION } from "@/components/scenes/quidditch/pitch";
import { createBuzz, createFlight, createSnitch } from "@/components/scenes/quidditch/snitch";
import { playSfx } from "@/lib/audio/sfx";
import { createDiaryPage } from "@/lib/three/diaryPage";
import { createPointer, damp } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

const CAMERA_POSITION = new THREE.Vector3(0, 3.6, 12);
const CAMERA_TARGET = new THREE.Vector3(0, 4.6, -8);
// Donde queda la snitch atrapada: delante de la cámara.
const CAUGHT_POINT = new THREE.Vector3(0, 3.7, 8.4);
// Segundos de vuelo hasta que la snitch está agotada.
const TIRE_SECONDS = 35;
// Un toque que pasa a menos de esta distancia la asusta.
const NEAR_MISS = 2.6;
// Accio dibujado: la snitch se acerca hasta acá y aguanta unos segundos.
const ACCIO_POINT = new THREE.Vector3(0, 4.2, 3);
const ACCIO_SECONDS = 3.5;

function setupQuidditch(ctx) {
  const { scene, camera, renderer, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  scene.background = new THREE.Color("#05070d");
  scene.fog = new THREE.FogExp2("#0b1020", 0.018);
  camera.fov = 55;
  camera.far = 200;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  scene.add(buildPitch());
  scene.add(new THREE.HemisphereLight("#41557f", "#0d140c", 0.7));
  const moon = new THREE.DirectionalLight("#b7c6ee", 1.1);
  moon.position.copy(MOON_DIRECTION).multiplyScalar(40);
  scene.add(moon);

  const snitch = createSnitch();
  scene.add(snitch.group);
  const caughtAtStart = props.current.discovered;
  const flight = createFlight(caughtAtStart ? CAUGHT_POINT : new THREE.Vector3(-4, 5, -4));

  const { page, material: pageMaterial } = createDiaryPage();
  page.scale.setScalar(caughtAtStart ? 1 : 0.001);
  page.visible = caughtAtStart;
  scene.add(page);

  const trail = createSparks({ max: 400, size: 0.09, gravity: -0.4, drag: 3 });
  const bursts = createSparks({ max: 300, size: 0.14 });
  scene.add(trail.points, bursts.points);

  const buzz = createBuzz();
  const pointer = createPointer(ctx);
  // Atrapar se hace al toque: el cursor de la varita ya alcanza.
  const projected = new THREE.Vector3();
  const closest = new THREE.Vector3();

  let flyTime = 0;
  let misses = 0;
  let state = caughtAtStart ? "caught" : "flying"; // flying | pulled | summoned | caught
  let pulledFor = 0;
  let lastSpellAt = props.current.spellCast?.at ?? 0;
  let caughtFor = caughtAtStart ? 99 : 0;
  let solvedByPlaying = false;

  function catchIt(byPlaying) {
    state = "caught";
    caughtFor = 0;
    solvedByPlaying = byPlaying;
    playSfx("catch");
    bursts.emit(flight.position, { count: 160, speed: 3.6, lifetime: 1.3 });
  }

  pointer.onTap(() => {
    if ((state !== "flying" && state !== "pulled") || props.current.casting) return;
    if (pointer.cast(snitch.hitArea, false).length > 0) {
      catchIt(true);
      return;
    }
    // Casi: el toque pasó cerca. La snitch se asusta, escapa y se cansa.
    pointer.ray().closestPointToPoint(flight.position, closest);
    if (state === "flying" && closest.distanceTo(flight.position) < NEAR_MISS) {
      misses += 1;
      flight.dart();
      projected.copy(flight.position).project(camera);
      playSfx("whoosh", { pan: projected.x });
      bursts.emit(flight.position, { count: 20, speed: 1.2, lifetime: 0.5 });
    }
  });

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.9, radius: 0.5, threshold: 0.8 },
    grade: { warmth: [0.94, 0.99, 1.08], vignette: 0.55 },
  });

  return {
    composer,
    dispose() {
      buzz.dispose();
    },
    update({ elapsed, delta, reducedMotion }) {
      const step = reducedMotion ? 1 / 60 : delta;

      if (props.current.casting && state === "flying") {
        state = "summoned";
        bursts.emit(CAUGHT_POINT, { count: 40, speed: 1.5, lifetime: 0.6 });
      }

      // Accio dibujado: la snitch viene hacia vos, pero hay que atraparla.
      const cast = props.current.spellCast;
      if (cast && cast.at !== lastSpellAt) {
        lastSpellAt = cast.at;
        if (cast.id === "accio" && state === "flying") {
          state = "pulled";
          pulledFor = 0;
          trail.emit(flight.position, { count: 60, speed: 2, lifetime: 0.8 });
        }
      }

      if (state === "pulled") {
        pulledFor += step;
        flight.pull(ACCIO_POINT.clone().add(new THREE.Vector3(Math.sin(elapsed * 2) * 0.8, Math.cos(elapsed * 2.6) * 0.4, 0)), step, 1.6);
        // Se suelta y escapa, más cansada que antes.
        if (pulledFor > ACCIO_SECONDS) {
          state = "flying";
          misses += 1;
          flight.dart();
        }
      } else if (state === "flying") {
        flyTime += step;
        // Con prefers-reduced-motion vuela siempre a la velocidad más lenta.
        const fatigue = reducedMotion ? 1 : Math.min(1, flyTime / TIRE_SECONDS + misses * 0.12);
        flight.update(step, fatigue);
      } else if (state === "summoned") {
        flight.pull(CAUGHT_POINT, step, 4);
        if (flight.position.distanceTo(CAUGHT_POINT) < 0.3) catchIt(false);
      } else {
        caughtFor += step;
        flight.pull(CAUGHT_POINT.clone().add(new THREE.Vector3(0, Math.sin(elapsed * 1.5) * 0.06, 0)), step, 3);
        if (caughtFor > 0.5) {
          page.visible = true;
          page.scale.setScalar(damp(page.scale.x, 1, 4, step));
        }
        if (solvedByPlaying && caughtFor > 1.3) {
          solvedByPlaying = false;
          props.current.onSolve();
        }
      }

      snitch.group.position.copy(flight.position);
      const speed = flight.velocity.length();
      if (speed > 0.1) snitch.group.rotation.y = Math.atan2(flight.velocity.x, flight.velocity.z);
      snitch.flap(elapsed, state === "caught" ? 6 : 42, state === "caught" && caughtFor > 0.4);
      if (state !== "caught" && !reducedMotion) {
        trail.emit(flight.position, { count: 2, speed: 0.25, intensity: 1.3, lifetime: 0.6 });
      }

      // La página sale de entre las alas y gira despacio.
      page.position.copy(flight.position).add(new THREE.Vector3(0.55, 0.1, 0));
      page.rotation.y = Math.sin(elapsed * 0.8) * 0.4;
      pageMaterial.emissiveIntensity = 0.5;

      projected.copy(flight.position).project(camera);
      buzz.update({ pan: projected.x, distance: camera.position.distanceTo(flight.position), speed, quiet: state === "caught" });

      // El cursor cambia cuando la snitch está a tiro.
      if (pointer.state.inside && (state === "flying" || state === "pulled")) {
        pointer.setCursor(pointer.cast(snitch.hitArea, false).length > 0 ? "pointer" : "");
      }

      if (!reducedMotion) {
        camera.position.set(CAMERA_POSITION.x + pointer.ndc.x * 0.5, CAMERA_POSITION.y + pointer.ndc.y * 0.25, CAMERA_POSITION.z);
        camera.lookAt(CAMERA_TARGET);
      }

      trail.update(step);
      bursts.update(reducedMotion ? 1 : step);
    },
  };
}

export default function Quidditch({ place, discovered, casting, onSolve, spellCast }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupQuidditch, { place, discovered, casting, onSolve, spellCast }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="Campo de Quidditch de noche: una snitch dorada vuela rápido entre los aros y las tribunas"
    />
  );
}
