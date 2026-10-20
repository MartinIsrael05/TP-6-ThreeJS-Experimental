"use client"; // Hook con estado: qué varita tenés en la mano en Ollivanders y cómo reaccionó.

import { useState } from "react";
import { getWand, wands } from "@/data/wands";
import { playSfx } from "@/lib/audio/sfx";

// Sonido de cada reacción: la escena muestra el efecto.
const TRIAL_SFX = { vela: "puff", frasco: "glass", estante: "rattle", chispas: "spell" };
const SHAKE_COOLDOWN_MS = 1200;

// Fases: "browsing" (ninguna varita en la mano), "holding" (una en la mano,
// agitada o no) y "chosen" (te quedaste con una). trial ({ wandId, at })
// avisa a la escena cada vez que una varita reacciona.
export function useWandShop({ onChoose }) {
  const [state, setState] = useState({ heldId: null, shaken: false, tried: [], chosenId: null, trial: null });
  const held = state.heldId ? getWand(state.heldId) : null;
  const phase = state.chosenId ? "chosen" : held ? "holding" : "browsing";

  // Abrir una caja: primero las que todavía no probaste, en orden.
  function pickBox() {
    if (state.chosenId) return;
    const untried = wands.filter((wand) => !state.tried.includes(wand.id) && wand.id !== state.heldId);
    const currentIndex = wands.findIndex((wand) => wand.id === state.heldId);
    const next = untried[0] ?? wands[(currentIndex + 1) % wands.length];
    playSfx("tap");
    setState({ ...state, heldId: next.id, shaken: false });
  }

  // Agitar la varita en la mano (o probarla desde la alternativa accesible).
  function shake(wandId = state.heldId) {
    const wand = getWand(wandId);
    if (!wand || state.chosenId) return;
    const now = Date.now();
    if (state.trial?.wandId === wandId && now - state.trial.at < SHAKE_COOLDOWN_MS) return;
    playSfx(TRIAL_SFX[wand.trial]);
    setState({
      ...state,
      heldId: wandId,
      shaken: true,
      tried: state.tried.includes(wandId) ? state.tried : [...state.tried, wandId],
      trial: { wandId, at: now },
    });
  }

  function choose() {
    if (!held || !state.shaken) return;
    onChoose(held.id);
    setState({ ...state, chosenId: held.id });
  }

  return {
    phase,
    held,
    shaken: state.shaken,
    trial: state.trial,
    pickBox,
    shake,
    choose,
    close: () => setState({ heldId: null, shaken: false, tried: [], chosenId: null, trial: null }),
  };
}
