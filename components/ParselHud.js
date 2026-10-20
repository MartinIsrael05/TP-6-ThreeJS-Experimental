"use client"; // Usa el micrófono, el teclado y el puntero para sisear, con efectos y estado.

import { useEffect, useRef, useState } from "react";
import { parsel } from "@/data/places";
import { unlockAudio } from "@/lib/audio/engine";
import { startHissDetection } from "@/lib/audio/hissDetector";
import { holdHiss } from "@/lib/audio/sfx";

// Cuadros seguidos con (o sin) siseo para cambiar de estado: evita que un
// ruido suelto corte o empiece un siseo.
const FRAMES_ON = 2;
const FRAMES_OFF = 5;

// Panel de la Cámara. Muestra el patrón de la puerta (punto = siseo corto,
// raya = largo) y deja sisear de tres maneras: al micrófono, manteniendo
// apretado el botón o la barra espaciadora. Escribe en hissRef.current.active
// si estás siseando; la escena mide cuánto dura.
export default function ParselHud({ hissRef, state, onReplay }) {
  const [mic, setMic] = useState("off"); // off | asking | on | error
  const detectorRef = useRef(null);
  const meterRef = useRef(null);
  const stopHoldRef = useRef(null);
  const micActiveRef = useRef(false);

  function setActive() {
    hissRef.current.active = Boolean(stopHoldRef.current) || micActiveRef.current;
  }

  function startHold() {
    if (stopHoldRef.current) return;
    stopHoldRef.current = holdHiss();
    setActive();
  }

  function endHold() {
    stopHoldRef.current?.();
    stopHoldRef.current = null;
    setActive();
  }

  async function enableMic() {
    setMic("asking");
    try {
      const audio = unlockAudio();
      detectorRef.current = await startHissDetection(audio.context);
      setMic("on");
    } catch {
      setMic("error");
    }
  }

  // Lectura del micrófono en cada cuadro; el medidor se mueve sin renderizar.
  useEffect(() => {
    if (mic !== "on") return undefined;
    let frameId = 0;
    let on = 0;
    let off = 0;
    function loop() {
      frameId = requestAnimationFrame(loop);
      const { level, hissing } = detectorRef.current.read();
      meterRef.current?.style.setProperty("--nivel", level.toFixed(3));
      on = hissing ? on + 1 : 0;
      off = hissing ? 0 : off + 1;
      if (on >= FRAMES_ON) micActiveRef.current = true;
      if (off >= FRAMES_OFF) micActiveRef.current = false;
      setActive();
    }
    loop();
    return () => cancelAnimationFrame(frameId);
  });

  // Barra espaciadora: mantener apretada es sisear.
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

  // Al irse: se corta el siseo y se apaga el micrófono.
  useEffect(
    () => () => {
      stopHoldRef.current?.();
      detectorRef.current?.stop();
      hissRef.current.active = false;
    },
    [hissRef],
  );

  if (!state || state.mode === "opening" || state.mode === "open") return null;
  const { mode, round, rounds, pattern, input } = state;

  return (
    <section className="parsel-hud hud" aria-live="polite" aria-label="Pársel">
      <p className="sorting-step">
        {parsel.title} · ronda {round + 1} de {rounds}
      </p>
      <ol className="parsel-pattern" aria-label="Patrón de la puerta">
        {pattern.map((symbol, index) => (
          <li
            key={`${round}-${index}`}
            data-kind={symbol}
            data-state={index < input ? "done" : index === input && mode === "input" ? "now" : "wait"}
          >
            <span className="sr-only">{symbol === "l" ? "largo" : "corto"}</span>
          </li>
        ))}
      </ol>
      <p className="parsel-status">{parsel.status[mode]}</p>

      <div className="parsel-controls">
        {mic === "on" ? (
          <span className="parsel-meter" ref={meterRef} aria-hidden="true">
            <i />
          </span>
        ) : (
          <button className="parsel-mic" onClick={enableMic} disabled={mic === "asking"}>
            {mic === "error" ? parsel.micError : parsel.mic}
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
          {parsel.hold}
        </button>
        <button className="parsel-replay" onClick={onReplay}>
          {parsel.replay}
        </button>
      </div>
    </section>
  );
}
