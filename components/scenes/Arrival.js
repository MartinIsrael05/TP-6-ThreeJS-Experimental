"use client"; // Escena Three.js: necesita WebGL, el DOM y el scroll del navegador.

import { useRef } from "react";
import * as THREE from "three";
import { useThreeScene } from "@/hooks/useThreeScene";
import { buildCastle } from "@/components/scenes/arrival/castle";
import { createBoat, createLake, createMist } from "@/components/scenes/arrival/lake";
import { createNightSky } from "@/lib/three/nightSky";
import { createComposer } from "@/lib/three/postprocessing";
import { createDotTexture } from "@/lib/three/sprites";

const FOG = new THREE.FogExp2("#0a1020", 0.013);
const MOON_DIRECTION = new THREE.Vector3(0.32, 0.28, -1).normalize();
const CASTLE_DIRECTION = new THREE.Vector3(0, 0.16, -1).normalize();

// Recorrido del bote según el scroll (0 a 1): de lejos, con una curva suave,
// hasta el pie del acantilado. La mirada sube hacia el castillo al final.
const PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 1.5, 44),
  new THREE.Vector3(5, 1.5, 22),
  new THREE.Vector3(-3, 1.5, 0),
  new THREE.Vector3(2, 1.5, -22),
  new THREE.Vector3(0, 1.5, -40),
]);
const LOOK_FROM = new THREE.Vector3(0, 9, -72);
const LOOK_TO = new THREE.Vector3(0, 21, -72);

// Los otros botes: lado, adelanto y fase de cada uno respecto del nuestro.
const FLEET = [
  [-4.5, -6, 0.3],
  [5, -10, 1.7],
  [-7, -18, 2.4],
  [3.5, -24, 0.9],
  [-2.5, 6, 3.1],
  [7.5, 2, 4.2],
];

function setupArrival(ctx) {
  const { scene, camera, renderer, props } = ctx;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.background = new THREE.Color("#04060d");
  scene.fog = FOG;
  camera.fov = 55;
  camera.far = 400;

  const sky = createNightSky({ radius: 220, moonDirection: MOON_DIRECTION, horizon: "#1a2744", stars: 1200 });
  scene.add(sky);

  const lake = createLake({ moonDirection: MOON_DIRECTION, castleDirection: CASTLE_DIRECTION, fog: FOG });
  scene.add(lake.mesh);

  // Montañas: siluetas facetadas detrás del castillo.
  // Cada montaña es un cono con los vértices corridos: así deja de parecer
  // una pirámide. El corrimiento sale de la posición (no de Math.random) para
  // que los vértices repetidos de la costura se muevan igual y no se abran.
  const hash = (x, y, z) => {
    const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return value - Math.floor(value) - 0.5;
  };
  const mountainMaterial = new THREE.MeshStandardMaterial({ color: "#0d121d", roughness: 1, flatShading: true });
  [
    [-60, -120, 38, 30],
    [-20, -140, 30, 42],
    [35, -130, 34, 36],
    [80, -110, 26, 28],
  ].forEach(([x, z, radius, height]) => {
    const geometry = new THREE.ConeGeometry(radius, height, 14, 5);
    const vertex = new THREE.Vector3();
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index);
      const jitter = 1 - (vertex.y + height / 2) / height; // la punta se mueve menos
      const { x: px, y: py, z: pz } = vertex;
      vertex.x += hash(px, py, pz) * radius * 0.35 * jitter;
      vertex.z += hash(pz, px, py) * radius * 0.35 * jitter;
      vertex.y += hash(py, pz, px) * height * 0.12 * jitter;
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
    geometry.computeVertexNormals();
    const mountain = new THREE.Mesh(geometry, mountainMaterial);
    mountain.position.set(x, height / 2 - 2, z);
    scene.add(mountain);
  });

  const castle = buildCastle();
  scene.add(castle.group);

  const glowTexture = createDotTexture();
  const ours = createBoat({ glowTexture, withLight: true });
  scene.add(ours.group);
  const fleet = FLEET.map(([side, ahead, phase]) => {
    const boat = createBoat({ glowTexture });
    scene.add(boat.group);
    return { ...boat, side, ahead, phase };
  });

  const mist = createMist({ area: new THREE.Box3(new THREE.Vector3(-40, 0, -70), new THREE.Vector3(40, 3, 50)) });
  scene.add(mist.points);

  scene.add(new THREE.HemisphereLight("#33466e", "#05070c", 0.5));
  const moon = new THREE.DirectionalLight("#a9b9e6", 1.2);
  moon.position.copy(MOON_DIRECTION).multiplyScalar(-60).setY(60);
  scene.add(moon);

  let progress = 0;
  const position = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const look = new THREE.Vector3();
  const pathPoint = new THREE.Vector3();

  const composer = createComposer({
    renderer,
    scene,
    camera,
    bloom: { strength: 0.9, radius: 0.6, threshold: 0.8 },
    grade: { warmth: [0.96, 1, 1.06], vignette: 0.6 },
  });

  return {
    composer,
    update({ elapsed, delta, reducedMotion }) {
      // El scroll manda; el bote lo sigue con un poco de inercia.
      const target = props.current.progressRef.current ?? 0;
      progress = reducedMotion ? target : THREE.MathUtils.damp(progress, target, 3, delta);

      PATH.getPointAt(progress, position);
      PATH.getTangentAt(progress, tangent);
      const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.3) * 0.08;
      const roll = reducedMotion ? 0 : Math.sin(elapsed * 0.9) * 0.025;

      // Nuestro bote va un poco adelante y abajo de la cámara.
      ours.group.position.copy(position).addScaledVector(tangent, 3.4).setY(bob * 0.5);
      ours.group.rotation.set(0, Math.atan2(tangent.x, tangent.z), roll);

      camera.position.copy(position).setY(1.5 + bob);
      look.lerpVectors(LOOK_FROM, LOOK_TO, THREE.MathUtils.smoothstep(progress, 0.55, 1));
      camera.lookAt(look);
      camera.rotateZ(roll);

      // La flota avanza con nosotros, cada bote con su vaivén.
      fleet.forEach((boat) => {
        const at = THREE.MathUtils.clamp(progress + boat.ahead / PATH.getLength(), 0, 1);
        PATH.getPointAt(at, pathPoint);
        boat.group.position.set(pathPoint.x + boat.side, reducedMotion ? 0 : Math.sin(elapsed * 1.2 + boat.phase) * 0.06, pathPoint.z);
        boat.group.rotation.set(0, Math.PI + Math.sin(boat.phase) * 0.2, reducedMotion ? 0 : Math.sin(elapsed + boat.phase) * 0.04);
      });

      // Las ventanas se van encendiendo a medida que te acercás.
      const lit = 0.25 + progress * 0.75;
      castle.update(lit, delta);
      lake.uniforms.uWindows.value = lit;
      lake.uniforms.uTime.value = elapsed;
      mist.update(elapsed, delta);
      sky.position.copy(camera.position).setY(0);
    },
  };
}

// progressRef es una ref con el avance del scroll (0 a 1). Se lee en cada
// frame, así el scroll no hace renderizar React.
export default function Arrival({ progressRef }) {
  const mountRef = useRef(null);
  useThreeScene(mountRef, setupArrival, { progressRef }, "llegada");

  return (
    <div
      ref={mountRef}
      className="prologue-canvas"
      role="img"
      aria-label="Llegada a Hogwarts de noche: un bote con farol cruza el lago hacia el castillo, que enciende sus ventanas a medida que te acercás"
    />
  );
}
