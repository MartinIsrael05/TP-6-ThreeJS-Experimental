"use client"; // Prende la cámara, corre el modelo de la mano y mueve un puntero virtual.

import { useEffect, useRef, useState } from "react";
import { startHandTracking } from "@/lib/hands/handTracker";
import { createVirtualPointer } from "@/lib/hands/virtualPointer";

const ERRORS = {
  NotAllowedError: "No diste permiso para usar la cámara.",
  NotFoundError: "No encontramos ninguna cámara.",
  NotReadableError: "La cámara está ocupada por otra aplicación.",
};

// Botón para manejar la varita con la mano. Al activarlo se pide la cámara,
// se carga el modelo y aparece una vista chica de la cámara y un cursor de
// luz: la punta de los dedos es la varita y juntar pulgar e índice es tocar.
export default function HandControl() {
  const [status, setStatus] = useState("off"); // off | loading | on
  const [error, setError] = useState(null);
  const trackerRef = useRef(null);
  const previewRef = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => () => trackerRef.current?.stop(), []);

  useEffect(() => {
    if (!error) return undefined;
    const timeout = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  async function turnOn() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no deja usar la cámara.");
      return;
    }
    setStatus("loading");
    setError(null);
    const pointer = createVirtualPointer();
    try {
      const tracker = await startHandTracking({
        onFrame(frame) {
          pointer.update(frame);
          const cursor = cursorRef.current;
          if (!cursor) return;
          cursor.dataset.visible = frame ? "true" : "false";
          if (!frame) return;
          const { x, y } = pointer.position();
          cursor.style.transform = `translate(${x}px, ${y}px)`;
          cursor.dataset.pinched = frame.pinched ? "true" : "false";
        },
      });
      tracker.stopPointer = () => pointer.reset();
      trackerRef.current = tracker;
      setStatus("on");
    } catch (caught) {
      setStatus("off");
      setError(ERRORS[caught?.name] ?? "No pudimos encender la cámara.");
    }
  }

  function turnOff() {
    trackerRef.current?.stopPointer?.();
    trackerRef.current?.stop();
    trackerRef.current = null;
    setStatus("off");
  }

  // La vista de la cámara se monta cuando el estado pasa a "on".
  useEffect(() => {
    const tracker = trackerRef.current;
    const preview = previewRef.current;
    if (status !== "on" || !tracker || !preview) return undefined;
    preview.appendChild(tracker.video);
    return () => tracker.video.remove();
  }, [status]);

  return (
    <>
      <button
        type="button"
        className="hand-toggle"
        onClick={status === "on" ? turnOff : turnOn}
        disabled={status === "loading"}
        aria-pressed={status === "on"}
        title="La imagen de la cámara se procesa en tu equipo y no se guarda ni se envía."
      >
        <svg className="hand-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6m0-3a1.5 1.5 0 0 1 3 0v5.5A6.5 6.5 0 0 1 13.5 21h-1a6 6 0 0 1-4.6-2.2L4.6 14.6a1.5 1.5 0 0 1 2.3-1.9L8 14" />
        </svg>
        <span className="hand-label">
          {status === "loading" ? "Despertando la varita" : status === "on" ? "Soltar la mano" : "Usar mi mano"}
        </span>
      </button>

      {error && (
        <p className="hand-error" role="alert">
          {error} Podés seguir con el mouse o el dedo.
        </p>
      )}

      {status === "on" && (
        <>
          <div className="hand-preview" ref={previewRef} aria-hidden="true">
            <p>Juntá pulgar e índice para tocar</p>
          </div>
          <div className="hand-cursor" ref={cursorRef} data-visible="false" aria-hidden="true" />
        </>
      )}
    </>
  );
}
