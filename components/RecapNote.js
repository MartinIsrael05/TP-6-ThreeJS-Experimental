"use client"; // Diálogo con foco y teclado (Escape) del navegador.

import { useEffect, useRef } from "react";
import { recapTexts } from "@/data/places";
import { pauseScenes } from "@/lib/three/renderPause";

// "Lo que pasó hasta ahora": aparece al volver al sitio otro día (o con
// ?resumen en la URL). lines ya vienen armadas desde Experience.
export default function RecapNote({ lines, onClose }) {
  const buttonRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  // Tapa la escena: mientras está abierto, no se dibuja.
  useEffect(() => pauseScenes(), []);

  useEffect(() => {
    buttonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="recap-overlay">
      <section className="story-note is-recap" role="dialog" aria-modal="true" aria-labelledby="recap-title">
        <article className="note-sheet">
          <p className="note-eyebrow">{recapTexts.eyebrow}</p>
          <h2 id="recap-title">{recapTexts.title}</h2>
          <ul className="recap-lines">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
        <button className="note-close" ref={buttonRef} onClick={onClose}>
          {recapTexts.close}
        </button>
      </section>
    </div>
  );
}
