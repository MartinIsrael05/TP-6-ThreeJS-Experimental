"use client"; // Lee y cambia la preferencia de sonido guardada en el navegador.

import { useSyncExternalStore } from "react";
import { isMuted, setMuted, subscribeMuted, unlockAudio } from "@/lib/audio/engine";

// En el servidor no hay preferencia guardada: se dibuja con sonido y se
// corrige al hidratar.
const serverSnapshot = () => false;

export default function SoundToggle({ className = "sound-toggle" }) {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, serverSnapshot);

  function toggle() {
    unlockAudio();
    setMuted(!muted);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={!muted}
      title={muted ? "Activar el sonido" : "Silenciar"}
    >
      <span className="sound-bars" data-muted={muted} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="sound-label">{muted ? "Sin sonido" : "Sonido"}</span>
    </button>
  );
}
