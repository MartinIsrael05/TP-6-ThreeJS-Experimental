"use client"; // Diálogo con foco y teclado (Escape) del navegador.

import { useEffect, useRef } from "react";
import { places, storyNote } from "@/data/places";

// Nota del diario que se abre al llegar a un lugar: el punto de la historia
// en el que estás y lo que tenés que hacer. La escena arranca recién cuando
// la cerrás. No necesita Firebase ni la escena: es papel y tinta.
export default function StoryNote({ place, onClose }) {
  const buttonRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    buttonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === "Escape") closeRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <section className="story-note" role="dialog" aria-modal="true" aria-labelledby="note-title" aria-describedby="note-text">
      <article className="note-sheet">
        <p className="note-eyebrow">{storyNote.eyebrow(place.number, places.length)}</p>
        <h2 id="note-title">{place.note.title}</h2>
        <p id="note-text" className="note-text">
          {place.note.text}
        </p>
        <div className="note-goal">
          <small>{storyNote.goal}</small>
          <p>{place.instruction}</p>
        </div>
      </article>
      <button className="note-close" ref={buttonRef} onClick={onClose}>
        {storyNote.close}
      </button>
    </section>
  );
}
