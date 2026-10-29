"use client"; // Usa la cámara, el teclado y el puntero para cubrirse con la capa, con efectos y estado.

import { useEffect, useRef, useState } from "react";
import { cloak } from "@/data/places";
import { unlockAudio } from "@/lib/audio/engine";
import { startCloakDetection } from "@/lib/hands/cloakDetector";

const CAMERA_ERRORS = new Set(["NotAllowedError", "NotFoundError", "NotReadableError"]);

// Panel de la Sala de trofeos. Muestra qué hace Filch y cuánto falta, y deja
// cubrirse de tres maneras: con las dos manos frente a la cámara, manteniendo
// apretado el botón o la barra espaciadora. Escribe en cloakRef.current si
// estás cubierto y si ya empezaste a cruzar; la escena lo lee en cada cuadro.
export default function CloakHud({ cloakRef, state }) {
  const [camera, setCamera] = useState("off"); // off | asking | on | error
  const [hands, setHands] = useState(0);
  const detectorRef = useRef(null);
  const previewRef = useRef(null);
  const holdRef = useRef(false);
  const cameraCoveredRef = useRef(false);

  function sync() {
    cloakRef.current.covered = holdRef.current || cameraCoveredRef.current;
  }

  function start() {
    unlockAudio();
    cloakRef.current.started = true;
  }

  function startHold() {
    holdRef.current = true;
    sync();
  }

  function endHold() {
    holdRef.current = false;
    sync();
  }

  async function enableCamera() {
    setCamera("asking");
    try {
      detectorRef.current = await startCloakDetection({
        onFrame(frame) {
          cameraCoveredRef.current = frame.covered;
          sync();
          setHands(frame.hands);
        },
      });
      setCamera("on");
    } catch (error) {
      if (!CAMERA_ERRORS.has(error?.name)) console.warn("No se pudo usar la cámara para la capa.", error);
      setCamera("error");
    }
  }

  // La vista de la cámara se monta cuando el estado pasa a "on".
  useEffect(() => {
    const detector = detectorRef.current;
    const preview = previewRef.current;
    if (camera !== "on" || !detector || !preview) return undefined;
    preview.prepend(detector.video);
    return () => detector.video.remove();
  }, [camera]);

  // Barra espaciadora: mantener apretada es cubrirse.
  useEffect(() => {
    function isTyping(target) {
      return target.closest?.("input, textarea, select, [contenteditable]");
    }
    function onKeyDown(event) {
      if (event.code !== "Space" || event.repeat || isTyping(event.target)) return;
      event.preventDefault();
      startHold();
    }
    function onKeyUp(event) {
      if (event.code !== "Space") return;
      event.preventDefault();
      endHold();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  });

  // Al irse: se saca la capa y se apaga la cámara.
  useEffect(
    () => () => {
      detectorRef.current?.stop();
      cloakRef.current.covered = false;
      cloakRef.current.started = false;
    },
    [cloakRef],
  );

  const mode = state?.mode ?? "ready";
  const covered = Boolean(state?.covered);
  const progress = state?.progress ?? 0;

  return (
    <section className="cloak-hud hud" aria-label={cloak.title} data-mode={mode}>
      <p className="sorting-step">{cloak.title}</p>
      <p className="cloak-status" aria-live="polite">
        {cloak.status[mode]}
      </p>

      <div className="cloak-track" role="progressbar" aria-label={cloak.distance} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <i style={{ "--avance": progress }} />
      </div>

      {mode === "ready" ? (
        <button className="cloak-start" onClick={start}>
          {cloak.start}
        </button>
      ) : (
        <p className={`cloak-state ${covered ? "is-covered" : ""}`}>{covered ? cloak.covered : cloak.uncovered}</p>
      )}

      <div className="parsel-controls">
        {camera === "on" ? (
          <div className="cloak-preview" ref={previewRef} data-covered={covered} aria-hidden="true">
            <span>{covered ? cloak.covered : cloak.cameraHands(hands)}</span>
          </div>
        ) : (
          <button onClick={enableCamera} disabled={camera === "asking"}>
            {camera === "error" ? cloak.cameraError : cloak.camera}
          </button>
        )}
        <button
          className="parsel-hold"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onPointerCancel={endHold}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.repeat) startHold();
          }}
          onKeyUp={(event) => {
            if (event.key === "Enter") endHold();
          }}
        >
          {cloak.hold}
        </button>
      </div>
      {camera === "on" && <p className="sorting-help">{cloak.cameraOn}</p>}
    </section>
  );
}
