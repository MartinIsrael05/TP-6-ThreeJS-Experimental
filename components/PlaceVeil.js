"use client"; // Lee el store de transiciones del navegador y anima el velo entre rutas.

import { useSyncExternalStore } from "react";
import { getServerTransition, getTransition, subscribeTransition } from "@/lib/transition";

// Velo de tinta entre un lugar y otro, con el cartel del lugar al que vas.
// Está en el layout para que siga en pantalla mientras cambia la ruta.
export default function PlaceVeil() {
  const { phase, card, id } = useSyncExternalStore(subscribeTransition, getTransition, getServerTransition);
  if (phase === "idle" || !card) return null;

  return (
    <div
      key={id}
      className="place-veil"
      data-phase={phase}
      style={card.color ? { "--veil-luz": card.color } : undefined}
      role="status"
      aria-live="polite"
    >
      <div className="veil-card">
        {card.number && <p className="veil-number">{card.number}</p>}
        <p className="veil-label">{card.label}</p>
        <span className="veil-rule" aria-hidden="true" />
        {card.eyebrow && <p className="veil-eyebrow">{card.eyebrow}</p>}
      </div>
    </div>
  );
}
