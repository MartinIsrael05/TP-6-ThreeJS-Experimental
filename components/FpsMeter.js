"use client"; // Mide cuadros por segundo con requestAnimationFrame y lee la URL del navegador.

import { useEffect, useRef, useSyncExternalStore } from "react";

// Medidor para probar en celulares: se muestra solo si la URL tiene ?fps
// (por ejemplo /castillo/escaleras?fps). Muestra los FPS, la calidad que
// eligió la escena (alta, media o baja) y el pixel ratio.
const subscribe = () => () => {};
const getEnabled = () => new URLSearchParams(window.location.search).has("fps");
const getServerEnabled = () => false;

export default function FpsMeter() {
  const enabled = useSyncExternalStore(subscribe, getEnabled, getServerEnabled);
  const outputRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let frames = 0;
    let since = performance.now();
    let frameId = 0;
    function tick(now) {
      frameId = requestAnimationFrame(tick);
      frames += 1;
      if (now - since < 500) return;
      const fps = Math.round((frames * 1000) / (now - since));
      frames = 0;
      since = now;
      const stage = document.querySelector(".three-stage");
      const quality = stage?.dataset.quality ?? "sin escena";
      if (outputRef.current) outputRef.current.textContent = `${fps} FPS · ${quality} · DPR ${window.devicePixelRatio}`;
    }
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [enabled]);

  if (!enabled) return null;
  return <output className="fps-meter" ref={outputRef} aria-live="off" />;
}
