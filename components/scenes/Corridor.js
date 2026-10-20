"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { createMessage } from "@/components/scenes/pasillo/message";
import { playSfx } from "@/lib/audio/sfx";
import { createPbrMaterial } from "@/lib/three/pbrTextures";
import { createPointer, damp } from "@/lib/three/pointer";
import { createComposer } from "@/lib/three/postprocessing";
import { createSparks } from "@/lib/three/sparks";

const CAMERA_POSITION = new THREE.Vector3(0, 1.8, 7.5);
const CAMERA_TARGET = new THREE.Vector3(0, 2.2, 0);
const MESSAGE_SIZE = { width: 6.6, height: 1.65 };
const MESSAGE_CENTER = new THREE.Vector3(0, 2.6, 0.03);
// Cuánto del mensaje hay que haber iluminado para darlo por leído.
const READ_THRESHOLD = 0.78;
const CRACK = new THREE.Vector3(6.2, 4.3, 0.04);
const SPIDERS = 26;

// Arañas: puntitos oscuros que caminan por la pared hacia la misma grieta.
function createSpiders() {
  const geometry = new THREE.SphereGeometry(0.035, 6, 4);
  geometry.scale(1.3, 1, 0.5);
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: "#0b0806", roughness: 0.6 }), SPIDERS);
  const spiders = Array.from({ length: SPIDERS }, () => ({ position: new THREE.Vector3(), speed: 0, phase: Math.random() * 10 }));
  const dummy = new THREE.Object3D();
  const toCrack = new THREE.Vector3();

  function respawn(spider, anywhere) {
    spider.position.set(-6.5 + Math.random() * 9, 0.3 + Math.random() * (anywhere ? 4 : 1.5), 0.04);
    spider.speed = 0.18 + Math.random() * 0.25;
  }
  spiders.forEach((spider) => respawn(spider, true));

  return {
    mesh,
    update(time, delta) {
      spiders.forEach((spider, index) => {
        toCrack.subVectors(CRACK, spider.position);
        if (toCrack.length() < 0.15) respawn(spider, false);
        toCrack.normalize();
        // Avanzan a los tirones, como las arañas de verdad.
        const step = Math.max(0, Math.sin(time * 6 + spider.phase)) * spider.speed * delta * 2;
        spider.position.addScaledVector(toCrack, step);
        spider.position.y += Math.sin(time * 3 + spider.phase) * 0.002;
        dummy.position.copy(spider.position);
        dummy.rotation.z = Math.atan2(toCrack.y, toCrack.x);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

// Ondas en el agua: anillos que se abren y se apagan.
function createRipples(count = 8) {
  const geometry = new THREE.RingGeometry(0.92, 1, 48);
  geometry.rotateX(-Math.PI / 2);
  const ripples = Array.from({ length: count }, () => {
    const material = new THREE.MeshBasicMaterial({ color: "#9fc6d8", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.03;
    return { mesh, age: 99 };
  });
  let cursor = 0;
  return {
    meshes: ripples.map((ripple) => ripple.mesh),
    drop(x, z) {
      const ripple = ripples[cursor];
      cursor = (cursor + 1) % count;
      ripple.age = 0;
      ripple.mesh.position.x = x;
      ripple.mesh.position.z = z;
    },
    update(delta) {
      ripples.forEach((ripple) => {
        if (ripple.age > 2) return;
        ripple.age += delta;
        const t = ripple.age / 2;
        ripple.mesh.scale.setScalar(0.05 + t * 1.1);
        ripple.mesh.material.opacity = Math.max(0, 0.35 * (1 - t));
      });
    },
  };
}

function setupCorridor(ctx) {
  const { scene, camera, renderer, props } = ctx;
  const { place } = props.current;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  // Arrastrar con el dedo mueve la luz, no la página.
  renderer.domElement.style.touchAction = "none";
  scene.background = new THREE.Color("#06080a");
  scene.fog = new THREE.FogExp2("#06080a", 0.045);
  camera.fov = 50;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 6),
    createPbrMaterial(ctx, { folder: "gran-comedor", name: "medieval_blocks_03", repeat: [5, 2], color: "#4d4a44", tint: "#a9a59a" }),
  );
  wall.position.set(0, 3, 0);
  scene.add(wall);

  // Agua: casi negra y muy lisa, refleja la luz de la varita.
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshStandardMaterial({ color: "#0a0e12", roughness: 0.12, metalness: 0.4 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0, 6);
  scene.add(water);

  // Ventana con luz de luna a la izquierda.
  // Ventana en arco con parteluz: vidrio azul oscuro y marco de piedra.
  const arch = new THREE.Shape();
  arch.moveTo(-0.55, -1.1);
  arch.lineTo(0.55, -1.1);
  arch.lineTo(0.55, 0.55);
  arch.absarc(0, 0.55, 0.55, 0, Math.PI, false);
  arch.closePath();
  const window_ = new THREE.Group();
  window_.position.set(-4.6, 3.4, 0.02);
  window_.add(new THREE.Mesh(new THREE.ShapeGeometry(arch, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.16, 0.3) })));
  const mullion = new THREE.MeshStandardMaterial({ color: "#1c1a18", roughness: 0.9 });
  [
    [0.06, 2.75, 0, 0.1],
    [1.1, 0.06, 0, -0.1],
  ].forEach(([width, height, x, y]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.05), mullion);
    bar.position.set(x, y, 0.02);
    window_.add(bar);
  });
  scene.add(window_);

  const message = createMessage(place.secret ?? [place.title], MESSAGE_SIZE);
  message.mesh.position.copy(MESSAGE_CENTER);
  scene.add(message.mesh);

  const spiders = createSpiders();
  scene.add(spiders.mesh);
  const ripples = createRipples();
  ripples.meshes.forEach((mesh) => scene.add(mesh));
  const sparks = createSparks({ max: 300, size: 0.08 });
  scene.add(sparks.points);

  // Antes de Lumos se adivina la pared con la luna, pero no el mensaje.
  scene.add(new THREE.HemisphereLight("#2a3550", "#05070a", 0.55));
  const moon = new THREE.DirectionalLight("#7f9cd6", 0.8);
  moon.position.set(-6, 4, 6);
  scene.add(moon);

  // Luz de Lumos: un foco que sale de la varita (abajo a la derecha de la
  // cámara) y apunta adonde señala el puntero.
  const wandTip = new THREE.Vector3(0.9, 1.1, 6.4);
  const lumos = new THREE.SpotLight("#d8e6ff", 0, 25, 0.24, 0.7, 1.2);
  lumos.position.copy(wandTip);
  scene.add(lumos, lumos.target);
  const tipMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0) });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), tipMaterial);
  tip.position.copy(wandTip);
  scene.add(tip);

  const pointer = createPointer(ctx);
  const aim = new THREE.Vector3().copy(MESSAGE_CENTER);
  const aimTarget = aim.clone();
  const lightUv = new THREE.Vector2(0.5, 0.5);
  let lumosOn = props.current.discovered;
  let solved = props.current.discovered ? 1 : 0;
  let solving = -1;
  let coverageClock = 0;
  let castSweep = -1;
  const TIP_ON = new THREE.Color(2.2, 2.4, 3);

  if (solved) message.uniforms.uSolved.value = 1;

  // Ilumina el punto de la pared bajo el puntero y lo marca como leído.
  function shine(paint) {
    const hit = pointer.cast([message.mesh, wall], false)[0];
    if (!hit) return;
    aimTarget.copy(hit.point);
    if (hit.object === message.mesh && hit.uv) {
      lightUv.copy(hit.uv);
      if (paint) message.reveal(hit.uv);
    } else {
      // Fuera del cartel: la luz sigue, pero en coordenadas del cartel.
      lightUv.set((hit.point.x - MESSAGE_CENTER.x) / MESSAGE_SIZE.width + 0.5, (hit.point.y - MESSAGE_CENTER.y) / MESSAGE_SIZE.height + 0.5);
    }
  }

  pointer.onMove(() => {
    if (lumosOn) shine(solved === 0);
  });
  // Sin Lumos, tocar solo saca unas chispitas de la varita: la luz se
  // enciende dibujando el hechizo.
  pointer.onTap(() => {
    if (!lumosOn) {
      sparks.emit(wandTip, { count: 8, speed: 0.4, color: "#d8e6ff", intensity: 0.8, lifetime: 0.4 });
      return;
    }
    shine(solved === 0);
  });

  function lightUp() {
    lumosOn = true;
    sparks.emit(wandTip, { count: 40, speed: 1, color: "#d8e6ff", lifetime: 0.8 });
    shine(false);
  }

  let lastSpellAt = props.current.spellCast?.at ?? 0;

  function startSolve() {
    solving = 0;
    playSfx("hiss", { pitch: -7 });
    sparks.emit(MESSAGE_CENTER, { count: 80, speed: 2, color: "#ff5a3a", lifetime: 1.2 });
  }

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.9, radius: 0.6, threshold: 0.75 },
    grade: { warmth: [0.9, 1, 1.12], vignette: 0.75 },
  });

  let dripClock = 1;

  // En pantallas angostas la cámara se aleja para que entre el mensaje entero.
  let distance = CAMERA_POSITION.z;
  const halfFov = THREE.MathUtils.degToRad(50 / 2);

  return {
    composer,
    resize(width, height) {
      distance = Math.max(CAMERA_POSITION.z, (MESSAGE_SIZE.width / 2 + 0.5) / (Math.tan(halfFov) * (width / height)));
    },
    update({ elapsed, delta, reducedMotion }) {
      const step = reducedMotion ? 1 : delta;

      const cast = props.current.spellCast;
      if (cast && cast.at !== lastSpellAt) {
        lastSpellAt = cast.at;
        if (cast.id === "lumos" && !lumosOn) lightUp();
      }

      // Lumos desde el botón: la luz recorre los dos renglones sola.
      if (props.current.casting && castSweep < 0 && solved === 0) {
        castSweep = 0;
        lumosOn = true;
      }
      if (castSweep >= 0 && solved === 0 && solving < 0) {
        castSweep += step / 1.5;
        const t = Math.min(castSweep, 1);
        const row = t < 0.5 ? 0 : 1;
        const u = 0.08 + ((t % 0.5) / 0.5) * 0.84;
        lightUv.set(row === 0 ? u : 1 - u, row === 0 ? 0.7 : 0.32);
        message.reveal(lightUv, 18);
        aimTarget.set(MESSAGE_CENTER.x + (lightUv.x - 0.5) * MESSAGE_SIZE.width, MESSAGE_CENTER.y + (lightUv.y - 0.5) * MESSAGE_SIZE.height, 0);
        if (castSweep >= 1) startSolve();
      }
      message.flush();

      // Cada tanto se mide cuánto se leyó.
      if (lumosOn && solved === 0 && solving < 0 && castSweep < 0) {
        coverageClock += step;
        if (coverageClock > 0.3) {
          coverageClock = 0;
          if (message.coverage() >= READ_THRESHOLD) startSolve();
        }
      }

      if (solving >= 0) {
        solving += step;
        message.uniforms.uSolved.value = Math.min(1, solving);
        if (solving >= 1.1) {
          solving = -1;
          solved = 1;
          if (castSweep < 0) props.current.onSolve();
        }
      }

      aim.lerp(aimTarget, 1 - Math.exp(-(delta || 1) * 10));
      lumos.target.position.copy(aim);
      lumos.intensity = damp(lumos.intensity, lumosOn ? 60 : 0, 6, delta || 1);
      tipMaterial.color.copy(TIP_ON).multiplyScalar(lumos.intensity / 60);
      message.uniforms.uLight.value.lerp(lightUv, 1 - Math.exp(-(delta || 1) * 10));
      message.uniforms.uLightOn.value = lumos.intensity / 60;
      message.uniforms.uTime.value = elapsed;

      // Gotas: una onda en el agua y su sonido, del lado en que cae.
      dripClock -= step;
      if (dripClock <= 0) {
        dripClock = 0.6 + Math.random() * 1.6;
        const x = -5 + Math.random() * 10;
        ripples.drop(x, 1 + Math.random() * 4);
        playSfx("drip", { pan: x / 6, gain: 0.07 });
      }
      ripples.update(step);
      spiders.update(elapsed, delta);
      sparks.update(step);

      // Paralaje con el puntero, salvo con prefers-reduced-motion.
      const sway = reducedMotion ? 0 : 1;
      camera.position.set(CAMERA_POSITION.x + pointer.ndc.x * 0.25 * sway, CAMERA_POSITION.y + pointer.ndc.y * 0.12 * sway, distance);
      camera.lookAt(CAMERA_TARGET);
    },
  };
}

export default function Corridor({ place, discovered, casting, onSolve, spellCast }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupCorridor, { place, discovered, casting, onSolve, spellCast }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label={`Pasillo inundado del segundo piso. En la pared hay un mensaje que solo se lee con luz: ${(place.secret ?? []).join(" ")}`}
    />
  );
}
