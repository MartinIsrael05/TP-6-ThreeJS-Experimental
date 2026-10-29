"use client"; // Lee el scroll de la página para mover el bote y mostrar los textos.

import { useEffect, useRef, useState } from "react";
import { prologue } from "@/data/places";
import Arrival from "@/components/scenes/Arrival";

// Desde qué avance del scroll (0 a 1) se muestra cada tramo: el título, los
// textos de prologue.beats y la invitación a abrir el diario.
const STOPS = [0, 0.16, 0.4, 0.64, 0.86];

// La sección es varias veces más alta que la pantalla; adentro, la escena
// queda fija (sticky) y el scroll solo cambia el avance. El avance va en una
// ref para que la escena lo lea en cada frame sin renderizar React; el tramo
// visible sí es estado, y cambia pocas veces.
// resumeLabel: el lugar donde quedaste, si ya habías entrado antes.
export default function Prologue({ onEnter, resumeLabel }) {
  const sectionRef = useRef(null);
  const progressRef = useRef(0);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    function read() {
      // Al navegar, el scroll arriba puede llegar con la sección ya desmontada.
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(Math.max(-rect.top / total, 0), 1) : 0;
      progressRef.current = progress;
      setStage(STOPS.findLastIndex((stop) => progress >= stop));
    }
    const frame = requestAnimationFrame(read);
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, []);

  const last = STOPS.length - 1;

  return (
    <section className="prologue" ref={sectionRef} aria-labelledby="intro-title">
      <div className="prologue-stage">
        <Arrival progressRef={progressRef} />

        <div className="prologue-text">
          <div className="prologue-beat is-title" data-active={stage === 0}>
            <h1 id="intro-title">{prologue.title}</h1>
            <p className="prologue-hint">{prologue.hint}</p>
          </div>
          {prologue.beats.map((beat, index) => (
            <p key={beat} className="prologue-beat" data-active={stage === index + 1}>
              {beat}
            </p>
          ))}
          <div className="prologue-beat is-final" data-active={stage === last}>
            <button className="enter-button" onClick={onEnter}>
              {resumeLabel ? prologue.resume(resumeLabel) : prologue.cta}
            </button>
            <p className="intro-note">{prologue.note}</p>
          </div>
        </div>

        <button className="prologue-skip" onClick={onEnter}>
          {prologue.skip}
        </button>
      </div>
    </section>
  );
}
