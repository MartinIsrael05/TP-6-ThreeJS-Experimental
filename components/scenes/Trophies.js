"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildFilch, buildNorris } from "@/components/scenes/trofeos/filch";
import { buildRoom, EXIT } from "@/components/scenes/trofeos/room";
import { playSfx } from "@/lib/audio/sfx";
import { createPointer, damp, easeInOut } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";

// Recorrido: la cámara camina por el pasillo de START_Z a END_Z mientras no
// estés cubierto. Filch hace la ronda en el fondo: de espaldas (away), se da
// vuelta (turning), barre la sala con la linterna (looking) y vuelve (back).
// Si te ve sin la capa, volvés al último punto de control.
const START_Z = 10;
const END_Z = -4;
const EYE_HEIGHT = 1.55;
const WALK_SECONDS = 15;
const CHECKPOINTS = [0, 0.34, 0.67];
const TURN_SECONDS = 1.2;
const BACK_SECONDS = 0.9;
const CAUGHT_SECONDS = 1.6;
// Cuánto podés tardar en cubrirte una vez que la linterna ya te apunta.
const GRACE_SECONDS = 0.18;
const DONE_SECONDS = 2;
const FILCH_Z = -11;
const NORRIS_POSITION = new THREE.Vector3(-0.9, 0, -9.6);
const EXIT_LOOK = new THREE.Vector3(EXIT.x, 1.3, EXIT.z);

const zAt = (progress) => THREE.MathUtils.lerp(START_Z, END_Z, progress);
const between = (min, max) => min + Math.random() * (max - min);

function setupTrophies(ctx) {
  const { scene, camera, renderer, mount, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color("#050608");
  scene.fog = new THREE.FogExp2("#06070a", 0.05);
  camera.fov = 55;
  camera.position.set(0, EYE_HEIGHT, START_Z);
  camera.lookAt(0, EYE_HEIGHT, START_Z - 5);

  const armorZ = CHECKPOINTS.slice(1).map((checkpoint) => zAt(checkpoint) - 0.4);
  const room = buildRoom(ctx, { armorZ });
  scene.add(room.group);
  scene.add(new THREE.HemisphereLight("#33415a", "#0a0806", 0.5));

  const filch = buildFilch();
  filch.group.position.set(0.4, 0, FILCH_Z);
  filch.group.rotation.y = Math.PI;
  scene.add(filch.group);
  const norris = buildNorris();
  norris.group.position.copy(NORRIS_POSITION);
  norris.group.rotation.y = Math.PI;
  scene.add(norris.group);

  const pointer = createPointer(ctx);

  // Estado del juego.
  const solved = props.current.discovered;
  let mode = solved ? "done" : "ready"; // ready | away | turning | looking | back | caught | done | casting
  let clock = solved ? DONE_SECONDS : 0;
  let phaseLength = 0;
  let progress = solved ? 1 : 0;
  let caughtFrom = 0;
  let caughtTo = 0;
  let exposed = 0;
  let wasCovered = false;
  let stepClock = 0;
  let filchStepClock = 0;
  let walkPhase = 0;
  let facing = 0; // 0 de espaldas, 1 mirando hacia la cámara
  let doneReported = solved;

  function setMode(next, length = 0) {
    mode = next;
    clock = 0;
    phaseLength = length;
  }

  // Le cuenta al panel en qué va el juego (solo cuando algo cambia).
  let reported = "";
  function report(covered) {
    const shown = mode === "back" ? "looking" : mode === "casting" ? "done" : mode;
    const state = { mode: shown, progress: Math.round(progress * 40) / 40, covered };
    const key = JSON.stringify(state);
    if (key === reported) return;
    reported = key;
    props.current.onCloakState?.(state);
  }

  // Tocar la escena también empieza a cruzar.
  pointer.onTap(() => {
    if (mode === "ready") props.current.cloakRef.current.started = true;
  });

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.85, radius: 0.55, threshold: 0.8 },
    grade: { warmth: [0.95, 0.98, 1.08], vignette: 0.8 },
  });

  const look = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  return {
    composer,
    dispose() {
      delete mount.dataset.cloak;
      delete mount.dataset.caught;
    },
    update({ elapsed, delta, reducedMotion }) {
      const step = reducedMotion ? 1 / 30 : delta;
      clock += step;
      const cloak = props.current.cloakRef?.current ?? {};
      const casting = props.current.casting;

      // Desde el botón alternativo: la capa te cubre y cruzás solo.
      if (casting && mode !== "casting" && mode !== "done") setMode("casting");
      if (mode === "ready" && cloak.started) setMode("away", between(3.2, 4.2));

      const covered = mode === "casting" || (mode !== "done" && Boolean(cloak.covered));
      if (covered !== wasCovered) {
        wasCovered = covered;
        if (mode !== "done") playSfx("cloak", { off: !covered });
      }
      mount.dataset.cloak = covered ? "on" : "off";

      // Ronda de Filch.
      if (mode === "away" && clock >= phaseLength) setMode("turning", TURN_SECONDS);
      else if (mode === "turning" && clock >= phaseLength) {
        setMode("looking", between(2.2, 3.4));
        exposed = 0;
      } else if (mode === "looking") {
        exposed = covered ? 0 : exposed + step;
        if (exposed > GRACE_SECONDS) {
          setMode("caught", CAUGHT_SECONDS);
          caughtFrom = progress;
          caughtTo = CHECKPOINTS.findLast((checkpoint) => checkpoint <= progress + 0.001) ?? 0;
          playSfx("meow", { pan: -0.2 });
          playSfx("error");
          mount.dataset.caught = "true";
        } else if (clock >= phaseLength) setMode("back", BACK_SECONDS);
      } else if (mode === "back" && clock >= phaseLength) setMode("away", between(2.6, 4.4));
      else if (mode === "caught") {
        progress = THREE.MathUtils.lerp(caughtFrom, caughtTo, easeInOut(clock / phaseLength));
        if (clock > 0.5) delete mount.dataset.caught;
        if (clock >= phaseLength) setMode("back", BACK_SECONDS);
      }

      // Caminar: solo sin la capa y mientras Filch no te está mirando de
      // frente (en ese caso te ve igual y es mejor no sumar pasos).
      const walking = !covered && (mode === "away" || mode === "turning" || mode === "looking" || mode === "back");
      if (walking) {
        progress = Math.min(1, progress + step / WALK_SECONDS);
        walkPhase += step * 7;
        stepClock -= step;
        if (stepClock <= 0) {
          stepClock = 0.48;
          playSfx("step", { gain: 0.035, pan: Math.sin(walkPhase) * 0.3 });
        }
        if (progress >= 1) {
          setMode("done");
          playSfx("align", { step: 6 });
        }
      }
      if (mode === "casting") progress = Math.min(1, progress + step / 1.5);

      // Filch: gira según la fase y arrastra los pies cuando camina.
      const targetFacing = mode === "turning" ? easeInOut(clock / phaseLength)
        : mode === "looking" || mode === "caught" ? 1
          : mode === "back" ? 1 - easeInOut(clock / phaseLength)
            : 0;
      facing = mode === "turning" || mode === "back" ? targetFacing : damp(facing, targetFacing, 6, delta || 1);
      const sweep = mode === "looking" ? Math.sin(clock * 1.6) * 0.32 : 0;
      filch.group.rotation.y = Math.PI * (1 - facing) + sweep;
      const strolling = mode === "away" || mode === "ready" || mode === "done" || mode === "casting";
      if (strolling && !reducedMotion) {
        filch.group.position.x = damp(filch.group.position.x, 0.4 + Math.sin(elapsed * 0.35) * 1.3, 2, delta || 1);
        filchStepClock -= step;
        if (filchStepClock <= 0 && mode === "away") {
          filchStepClock = 0.75;
          playSfx("step", { gain: 0.03, pan: filch.group.position.x / 4 });
        }
      }
      if (mode === "turning") {
        filchStepClock -= step;
        if (filchStepClock <= 0) {
          filchStepClock = 0.35;
          playSfx("step", { gain: 0.08, pan: filch.group.position.x / 4 });
        }
      }

      // La linterna ilumina de verdad solo cuando apunta hacia la sala.
      filch.spot.intensity = facing * 70;
      filch.beam.material.uniforms.uIntensity.value = 0.12 + facing * 0.45;
      filch.beam.material.uniforms.uTime.value = elapsed;
      filch.flame.scale.setScalar(1 + Math.sin(elapsed * 13) * 0.08);

      // Señora Norris: mira con él y le brillan los ojos.
      norris.group.rotation.y = Math.PI * (1 - facing);
      const eyes = 0.15 + facing * (mode === "caught" ? 3 : 1.6);
      norris.eyeMaterial.color.setRGB(2.2 * eyes, 1.9 * eyes, 0.35 * eyes);
      norris.tail.rotation.z = Math.sin(elapsed * 1.4) * 0.15;

      room.flames.forEach(({ flame, light, phase }) => {
        const flicker = 1 + Math.sin(elapsed * 9 + phase) * 0.1 + Math.sin(elapsed * 15 + phase * 2) * 0.06;
        flame.scale.set(flicker, flicker * 1.1, flicker);
        light.intensity = 5 * flicker;
      });

      // Al llegar se abre la puerta del baño y la cámara gira hacia ella.
      const doneAmount = mode === "done" ? easeInOut(clock / DONE_SECONDS) : 0;
      room.exitLeaf.rotation.y = -doneAmount * 1.4;
      room.exitGlow.color.setRGB(0.4 * doneAmount, 1.6 * doneAmount, 1 * doneAmount);
      if (mode === "done" && !doneReported && clock >= DONE_SECONDS) {
        doneReported = true;
        props.current.onSolve();
      }

      // Cámara: avanza por el pasillo, se bambolea al caminar, tiembla si te
      // atrapan y mira un poco hacia donde está el puntero.
      const bob = walking && !reducedMotion ? Math.sin(walkPhase) * 0.035 : 0;
      const shake = mode === "caught" && clock < 0.4 && !reducedMotion ? (Math.random() - 0.5) * 0.08 : 0;
      const crouch = covered ? 0.18 : 0;
      camera.position.set(
        shake + (walking && !reducedMotion ? Math.sin(walkPhase / 2) * 0.03 : 0) + doneAmount * 1.4,
        EYE_HEIGHT - crouch + bob,
        zAt(progress) - doneAmount * 0.6,
      );
      const sway = reducedMotion ? 0 : 1;
      lookTarget.set(pointer.ndc.x * 1.2 * sway, EYE_HEIGHT - 0.1 + pointer.ndc.y * 0.6 * sway, camera.position.z - 6);
      lookTarget.lerp(EXIT_LOOK, doneAmount);
      look.lerp(lookTarget, look.lengthSq() === 0 ? 1 : 1 - Math.exp(-(delta || 1) * 6));
      camera.lookAt(look);

      report(covered);
    },
  };
}

export default function Trophies({ place, discovered, casting, onSolve, cloakRef, onCloakState }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupTrophies, { place, discovered, casting, onSolve, cloakRef, onCloakState }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage trophies-stage"
      role="img"
      aria-label="La Sala de trofeos de noche: vitrinas con copas, armaduras y, al fondo, Filch con su linterna y Señora Norris. A la derecha, la puerta hacia el baño clausurado"
    />
  );
}
