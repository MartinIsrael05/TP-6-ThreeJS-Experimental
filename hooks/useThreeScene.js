"use client"; // Hook de Three.js: usa WebGL, el DOM, ResizeObserver y requestAnimationFrame del navegador.

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { disposeComposer, disposeObject } from "@/lib/three/dispose";

// Calidad adaptable: después de que la escena arranca (shaders compilados,
// texturas subidas) se miden los FPS. Si no llegan al mínimo, se apaga el
// postprocesado y se baja el pixel ratio a 1.
const SAMPLE_FROM = 1.5;
const SAMPLE_TO = 4.5;
const MIN_FPS = 40;

// Arma y desarma una escena Three.js dentro de mountRef.
//
// setup(ctx) es una función estable (definida fuera del componente) que
// recibe { scene, camera, renderer, mount, props, listen, track, isActive }
// y devuelve { update, resize, dispose, composer }, todos opcionales:
// - props es una ref con las props actuales, para leerlas sin rearmar.
// - listen(target, tipo, fn) agrega un listener que se saca solo al desmontar.
// - track(recurso) registra algo con dispose() que no está en la escena.
// - update({ elapsed, delta, reducedMotion }) corre en cada frame. Con
//   prefers-reduced-motion el tiempo animado queda quieto.
//
// La escena se rearma solo cuando cambia sceneKey.
export function useThreeScene(mountRef, setup, props, sceneKey) {
  const propsRef = useRef(props);

  useEffect(() => {
    propsRef.current = props;
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (error) {
      console.warn("WebGL no está disponible: la escena 3D no se muestra.", error);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    mount.dataset.quality = "alta";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    const timer = new THREE.Timer();
    timer.connect(document);

    let active = true;
    const removers = [];
    const tracked = new Set();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;

    function listen(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      removers.push(() => target.removeEventListener(type, handler, options));
    }
    listen(motionQuery, "change", (event) => {
      reducedMotion = event.matches;
    });

    const api =
      setup({
        scene,
        camera,
        renderer,
        mount,
        props: propsRef,
        listen,
        track: (resource) => {
          tracked.add(resource);
          return resource;
        },
        isActive: () => active,
      }) ?? {};
    let composer = api.composer ?? null;

    function resize() {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (composer) {
        // Primero el tamaño lógico y después el pixel ratio: al revés, el
        // composer multiplicaría un ancho que ya viene en píxeles.
        composer.setSize(width, height);
        composer.setPixelRatio(renderer.getPixelRatio());
      }
      api.resize?.(width, height);
    }

    function lowerQuality(fps) {
      renderer.setPixelRatio(1);
      if (composer) {
        disposeComposer(composer);
        composer = null;
      }
      resize();
      mount.dataset.quality = "baja";
      console.info(`Escena 3D a ${Math.round(fps)} FPS: se apaga el postprocesado.`);
    }

    let animTime = 0;
    let sampleFrames = 0;
    let sampleTime = 0;
    let sampled = false;
    let frameId = 0;

    function frame(timestamp) {
      frameId = requestAnimationFrame(frame);
      timer.update(timestamp);
      // El timestamp de requestAnimationFrame puede ser anterior al momento en
      // que el Timer arrancó o se reinició (al volver a la pestaña): el delta
      // sale negativo y los suavizados y partículas corren para atrás hasta
      // dar valores infinitos. Se acota entre 0 y 100 ms.
      const delta = THREE.MathUtils.clamp(timer.getDelta(), 0, 0.1);
      if (!reducedMotion) animTime += delta;

      api.update?.({ elapsed: animTime, delta: reducedMotion ? 0 : delta, reducedMotion });
      if (composer) composer.render(delta);
      else renderer.render(scene, camera);

      if (sampled) return;
      const elapsed = timer.getElapsed();
      if (elapsed < SAMPLE_FROM) return;
      sampleFrames += 1;
      sampleTime += delta;
      if (elapsed < SAMPLE_TO) return;
      sampled = true;
      const fps = sampleFrames / Math.max(sampleTime, 0.001);
      mount.dataset.fps = String(Math.round(fps));
      if (fps < MIN_FPS && (composer || renderer.getPixelRatio() > 1)) lowerQuality(fps);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    frameId = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      removers.forEach((remove) => remove());
      api.dispose?.();
      if (composer) disposeComposer(composer);
      disposeObject(scene);
      tracked.forEach((resource) => resource.dispose());
      scene.clear();
      timer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete mount.dataset.quality;
      delete mount.dataset.fps;
    };
  }, [mountRef, setup, sceneKey]);
}
