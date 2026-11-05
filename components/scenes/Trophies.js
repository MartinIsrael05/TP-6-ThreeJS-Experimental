"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildFilch, buildNorris } from "@/components/scenes/trofeos/filch";
import { buildRoom, EXIT } from "@/components/scenes/trofeos/room";
import { playSfx } from "@/lib/audio/sfx";
import { createPointer, damp, easeInOut } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

// Recorrido: la cámara camina por el pasillo de START_Z a END_Z mientras no
// estés cubierto. Filch hace la ronda en el fondo: de espaldas (away), se da
// vuelta (turning), barre la sala con la linterna (looking) y vuelve (back).
// Si te ve sin la capa, volvés al último punto de control.
const START_Z = 10;
const END_Z = -4;
const EYE_HEIGHT = 1.55;
const WALK_SECONDS = 22;
const CHECKPOINTS = [0, 0.25, 0.5, 0.75];
// Amagues: pasada la primera armadura, a veces Filch empieza a darse vuelta
// y vuelve sin mirar. Quien se descubre apenas gira, pierde tiempo.
const FEINT_FROM = 0.25;
const FEINT_CHANCE = 0.35;
// Escudo de Riddle: detrás está la cuarta página.
const PLAQUE_POSITION = new THREE.Vector3(-3.05, 1.72, -2.5);
const TURN_SECONDS = 1.2;
const BACK_SECONDS = 0.9;
const CAUGHT_SECONDS = 1.6;
// Cuánto podés tardar en cubrirte una vez que la linterna ya te apunta.
const GRACE_SECONDS = 0.18;
const DONE_SECONDS = 2;
const FILCH_Z = -11;
const NORRIS_POSITION = new THREE.Vector3(-0.9, 0, -9.6);
const EXIT_LOOK = new THREE.Vector3(EXIT.x, 1.3, EXIT.z);

// Escudo dorado con el nombre de Riddle, colgado en una vitrina. Mira hacia
// el pasillo (+x) y tiene un área de toque más grande que él, invisible.
function buildPlaque(ctx) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  context.fillStyle = "#2a1c0c";
  context.fillRect(0, 0, 256, 320);
  context.fillStyle = "#f3d27a";
  context.textAlign = "center";
  context.font = "italic 30px Georgia, serif";
  context.fillText("Por servicios", 128, 120);
  context.fillText("especiales", 128, 158);
  context.fillText("al colegio", 128, 196);
  context.font = "bold 38px Georgia, serif";
  context.fillText("T. M. Riddle", 128, 262);
  const texture = ctx.track(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;

  const shield = new THREE.Shape();
  shield.moveTo(-0.22, 0.28);
  shield.lineTo(0.22, 0.28);
  shield.lineTo(0.22, -0.05);
  shield.quadraticCurveTo(0.2, -0.24, 0, -0.32);
  shield.quadraticCurveTo(-0.2, -0.24, -0.22, -0.05);
  shield.closePath();
  const geometry = new THREE.ShapeGeometry(shield, 12);
  // UV del canvas: la forma va de -0.22 a 0.22 y de -0.32 a 0.28.
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, (position.getX(index) + 0.22) / 0.44, (position.getY(index) + 0.32) / 0.6);
  }
  const material = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.8, roughness: 0.3, emissive: "#ffcf6a", emissiveMap: texture, emissiveIntensity: 0.3 });
  const face = new THREE.Mesh(geometry, material);
  const hitArea = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  const group = new THREE.Group();
  group.rotation.y = Math.PI / 2;
  group.add(face, hitArea);
  return { group, material, hitArea };
}

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

  const plaque = buildPlaque(ctx);
  plaque.group.position.copy(PLAQUE_POSITION);
  scene.add(plaque.group);
  const sparks = createSparks({ max: 200, size: 0.1 });
  scene.add(sparks.points);
  let secretTaken = Boolean(props.current.secretFound);

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
  let backFrom = 1; // desde dónde vuelve a darse vuelta (menos de 1 si amagó)
  let feint = false;
  let doneReported = solved;

  function setMode(next, length = 0) {
    mode = next;
    clock = 0;
    phaseLength = length;
  }

  // Le cuenta al panel en qué va el juego (solo cuando algo cambia).
  let reported = "";
  function report(covered) {
    const shown = mode === "back" ? (feint ? "away" : "looking") : mode === "casting" ? "done" : mode;
    const state = { mode: shown, progress: Math.round(progress * 40) / 40, covered };
    const key = JSON.stringify(state);
    if (key === reported) return;
    reported = key;
    props.current.onCloakState?.(state);
  }

  // Tocar el escudo de Riddle suelta la cuarta página; tocar la escena
  // también empieza a cruzar.
  pointer.onTap(() => {
    if (!secretTaken && pointer.cast(plaque.hitArea, false).length > 0) {
      secretTaken = true;
      sparks.emit(PLAQUE_POSITION, { count: 120, speed: 2.2, color: "#ffd88a", lifetime: 1.2 });
      props.current.onSecret?.();
      return;
    }
    if (mode === "ready") props.current.cloakRef.current.started = true;
  });
  pointer.onMove(() => {
    pointer.setCursor(!secretTaken && pointer.cast(plaque.hitArea, false).length > 0 ? "pointer" : "");
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
      if (mode === "away" && clock >= phaseLength) {
        feint = progress >= FEINT_FROM && Math.random() < FEINT_CHANCE;
        setMode("turning", TURN_SECONDS);
      } else if (mode === "turning" && feint && clock >= phaseLength * 0.55) {
        // Amague: vuelve a darse vuelta sin llegar a mirar.
        backFrom = facing;
        setMode("back", BACK_SECONDS * 0.8);
        const text = props.current.place.status?.feint;
        if (text) props.current.onStatus?.(text);
      } else if (mode === "turning" && clock >= phaseLength) {
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
        } else if (clock >= phaseLength) {
          backFrom = 1;
          setMode("back", BACK_SECONDS);
        }
      } else if (mode === "back" && clock >= phaseLength) {
        feint = false;
        // Pasada la mitad de la sala, Filch descansa menos entre vuelta y vuelta.
        setMode("away", progress > 0.5 ? between(2, 3.4) : between(2.6, 4.4));
      } else if (mode === "caught") {
        progress = THREE.MathUtils.lerp(caughtFrom, caughtTo, easeInOut(clock / phaseLength));
        if (clock > 0.5) delete mount.dataset.caught;
        if (clock >= phaseLength) {
          backFrom = 1;
          setMode("back", BACK_SECONDS);
        }
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
          : mode === "back" ? backFrom * (1 - easeInOut(clock / phaseLength))
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

      // El escudo de Riddle destella cada tanto y más con la linterna encima.
      plaque.material.emissiveIntensity = secretTaken ? 0.05 : 0.2 + Math.max(0, Math.sin(elapsed * 2.2)) ** 4 * 0.9 + facing * 0.4;
      sparks.update(reducedMotion ? 1 : step);

      room.flames.forEach(({ flame, light, phase }) => {
        const flicker = 1 + Math.sin(elapsed * 9 + phase) * 0.1 + Math.sin(elapsed * 15 + phase * 2) * 0.06;
        flame.scale.set(flicker, flicker * 1.1, flicker);
        if (light) light.intensity = 6 * flicker;
      });

      // Al llegar se abre la puerta del baño y la cámara gira hacia ella.
      const doneAmount = mode === "done" ? easeInOut(clock / DONE_SECONDS) : 0;
      room.exitLeaf.rotation.y = -doneAmount * 1.4;
      // Verde del baño de Myrtle, tenue para que el bloom no lo queme.
      room.exitGlow.color.setRGB(0.35 * doneAmount, 0.9 * doneAmount, 0.7 * doneAmount);
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
        // Al final se corre un poco hacia la puerta, sin pegarse: se ve la
        // puerta abierta con la sala alrededor.
        shake + (walking && !reducedMotion ? Math.sin(walkPhase / 2) * 0.03 : 0) + doneAmount * 0.5,
        EYE_HEIGHT - crouch + bob,
        zAt(progress) + doneAmount * 1.2,
      );
      const sway = reducedMotion ? 0 : 1;
      lookTarget.set(pointer.ndc.x * 1.2 * sway, EYE_HEIGHT - 0.1 + pointer.ndc.y * 0.6 * sway, camera.position.z - 6);
      lookTarget.lerp(EXIT_LOOK, doneAmount * 0.75);
      look.lerp(lookTarget, look.lengthSq() === 0 ? 1 : 1 - Math.exp(-(delta || 1) * 6));
      camera.lookAt(look);

      report(covered);
    },
  };
}

export default function Trophies({ place, discovered, casting, onSolve, cloakRef, onCloakState, onStatus, onSecret, secretFound }) {
  const mountRef = useRef(null);
  useThreeScene(
    mountRef,
    setupTrophies,
    { place, discovered, casting, onSolve, cloakRef, onCloakState, onStatus, onSecret, secretFound },
    place.id,
  );

  return (
    <div
      ref={mountRef}
      className="three-stage trophies-stage"
      role="img"
      aria-label="La Sala de trofeos de noche: vitrinas con copas, armaduras y, al fondo, Filch con su linterna y Señora Norris. A la derecha, la puerta hacia el baño clausurado"
    />
  );
}
