"use client"; // Three.js necesita el DOM, WebGL y useEffect: solo corre en el navegador.

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeArtifact({ place, onDiscover, discovered }) {
  const mountRef = useRef(null);
  const onDiscoverRef = useRef(onDiscover);

  useEffect(() => {
    onDiscoverRef.current = onDiscover;
  }, [onDiscover]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Los cuatro ingredientes de una escena Three.js: escena, camara,
    // renderer y objetos. Este componente es deliberadamente "vanilla".
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5.4);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.IcosahedronGeometry(1.18, 3);
    const material = new THREE.MeshStandardMaterial({
      color: place.color,
      emissive: place.color,
      emissiveIntensity: discovered ? 1.1 : 0.45,
      metalness: 0.72,
      roughness: 0.22,
      wireframe: !discovered,
    });
    const artifact = new THREE.Mesh(geometry, material);
    artifact.userData.clickable = true;
    group.add(artifact);

    const haloGeometry = new THREE.TorusGeometry(1.72, 0.012, 12, 180);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: place.accent,
      transparent: true,
      opacity: 0.75,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    halo.rotation.x = Math.PI / 2.6;
    group.add(halo);

    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(360 * 3);
    for (let index = 0; index < 360; index += 1) {
      const radius = 2.1 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[index * 3 + 2] = radius * Math.cos(phi);
    }
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: place.accent,
      size: 0.018,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.PointLight(place.accent, 18, 12);
    keyLight.position.set(2.5, 2, 3);
    scene.add(keyLight);

    const pointer = new THREE.Vector2(20, 20);
    const raycaster = new THREE.Raycaster();
    let hovered = false;
    let frameId;

    function resize() {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    }

    function updatePointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function handleMove(event) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      hovered = raycaster.intersectObject(artifact).length > 0;
      renderer.domElement.style.cursor = hovered ? "crosshair" : "grab";
    }

    function handleClick(event) {
      updatePointer(event);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(artifact).length > 0) {
        onDiscoverRef.current();
      }
    }

    const timer = new THREE.Timer();
    timer.connect(document);
    function animate(timestamp) {
      timer.update(timestamp);
      const elapsed = timer.getElapsed();
      group.rotation.y = elapsed * 0.24 + pointer.x * 0.18;
      group.rotation.x = Math.sin(elapsed * 0.42) * 0.12 + pointer.y * 0.08;
      halo.rotation.z = elapsed * -0.36;
      particles.rotation.y = elapsed * 0.018;
      const pulse = hovered ? 1.08 + Math.sin(elapsed * 8) * 0.035 : 1;
      artifact.scale.setScalar(pulse);
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    renderer.domElement.addEventListener("pointermove", handleMove);
    renderer.domElement.addEventListener("pointerdown", handleClick);
    resize();
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", handleMove);
      renderer.domElement.removeEventListener("pointerdown", handleClick);
      geometry.dispose();
      material.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [place, discovered]);

  return (
    <div
      ref={mountRef}
      className="three-stage"
      role="img"
      aria-label={`Artefacto tridimensional de ${place.label}`}
    />
  );
}
