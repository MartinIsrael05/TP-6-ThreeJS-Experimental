"use client"; // Escena Three.js: necesita WebGL, el DOM y eventos de puntero del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";

// Artefacto genérico para los lugares que todavía no tienen escena propia.
function setupArtifact({ scene, camera, renderer, props, listen }) {
  const { place, discovered } = props.current;
  camera.position.set(0, 0, 5.4);

  const group = new THREE.Group();
  scene.add(group);

  const artifact = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 3),
    new THREE.MeshStandardMaterial({
      color: place.color,
      emissive: place.color,
      emissiveIntensity: discovered ? 1.1 : 0.45,
      metalness: 0.72,
      roughness: 0.22,
      wireframe: !discovered,
    }),
  );
  group.add(artifact);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.72, 0.012, 12, 180),
    new THREE.MeshBasicMaterial({ color: place.accent, transparent: true, opacity: 0.75 }),
  );
  halo.rotation.x = Math.PI / 2.6;
  group.add(halo);

  const positions = new Float32Array(360 * 3);
  for (let index = 0; index < 360; index += 1) {
    const radius = 2.1 + Math.random() * 2.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    pointsGeometry,
    new THREE.PointsMaterial({ color: place.accent, size: 0.018, transparent: true, opacity: 0.7 }),
  );
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.PointLight(place.accent, 18, 12);
  keyLight.position.set(2.5, 2, 3);
  scene.add(keyLight);

  const pointer = new THREE.Vector2(20, 20);
  const raycaster = new THREE.Raycaster();
  let hovered = false;

  function updatePointer(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(artifact).length > 0;
  }

  listen(renderer.domElement, "pointermove", (event) => {
    hovered = updatePointer(event);
    renderer.domElement.style.cursor = hovered ? "crosshair" : "grab";
  });
  listen(renderer.domElement, "pointerdown", (event) => {
    if (updatePointer(event)) props.current.onDiscover();
  });

  return {
    update({ elapsed }) {
      group.rotation.y = elapsed * 0.24 + pointer.x * 0.18;
      group.rotation.x = Math.sin(elapsed * 0.42) * 0.12 + pointer.y * 0.08;
      halo.rotation.z = elapsed * -0.36;
      particles.rotation.y = elapsed * 0.018;
      artifact.scale.setScalar(hovered ? 1.08 + Math.sin(elapsed * 8) * 0.035 : 1);
    },
  };
}

export default function Artifact({ place, discovered, onDiscover }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupArtifact, { place, discovered, onDiscover }, `${place.id}:${discovered}`);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label={`Artefacto tridimensional de ${place.label}`}
    />
  );
}
