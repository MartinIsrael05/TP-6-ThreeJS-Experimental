"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { houses } from "@/data/houses";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildHall } from "@/components/scenes/great-hall/hall";

const FOG_COLOR = "#1b130d";
const CAMERA_POSITION = new THREE.Vector3(0, 2.6, -9);
const CAMERA_TARGET = new THREE.Vector3(0, 2.1, -30);
// Cuánto se corre la cámara con el puntero (paralaje), en metros.
const PARALLAX = new THREE.Vector2(0.45, 0.22);

// Luces reales: pocas y cálidas. El resto de la luz lo dan las velas con
// emissive y bloom.
const LIGHTS = [
  { position: [0, 5.2, -3], intensity: 26 },
  { position: [0, 5.2, -13], intensity: 30 },
  { position: [0, 5.2, -22], intensity: 30 },
  { position: [0, 4, -31], intensity: 34 },
];

function setupGreatHall(ctx) {
  const { scene, camera, renderer, listen } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.FogExp2(FOG_COLOR, 0.045);

  camera.fov = 50;
  camera.near = 0.1;
  camera.far = 80;
  camera.position.copy(CAMERA_POSITION);
  camera.lookAt(CAMERA_TARGET);

  const { group: hall } = buildHall(
    ctx,
    houses.map((house) => house.color),
  );
  scene.add(hall);

  scene.add(new THREE.HemisphereLight("#46557f", "#2a1a10", 0.6));
  const lights = LIGHTS.map(({ position, intensity }) => {
    const light = new THREE.PointLight("#ffb36b", intensity, 0, 2);
    light.position.set(...position);
    light.userData.base = intensity;
    scene.add(light);
    return light;
  });

  // Paralaje: el puntero (de -1 a 1) corre apenas la cámara, que sigue
  // mirando al mismo punto. Se suaviza para que no salte.
  const pointer = new THREE.Vector2();
  const eased = new THREE.Vector2();
  listen(renderer.domElement, "pointermove", (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  });
  listen(renderer.domElement, "pointerleave", () => pointer.set(0, 0));

  return {
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

      // Titileo de las luces: dos senos desfasados por luz, sin azar por
      // frame para que no parpadee.
      lights.forEach((light, index) => {
        const flicker = Math.sin(elapsed * 7.1 + index * 1.7) * 0.06 + Math.sin(elapsed * 13.3 + index) * 0.04;
        light.intensity = light.userData.base * (1 + flicker);
      });
    },
  };
}

export default function GreatHall({ place, discovered, onDiscover, house }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupGreatHall, { place, discovered, onDiscover, house }, place.id);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label="El Gran Comedor: cuatro mesas largas bajo velas flotantes y la mesa de profesores al fondo"
    />
  );
}
