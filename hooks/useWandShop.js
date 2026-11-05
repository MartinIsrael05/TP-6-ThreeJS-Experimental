"use client"; // Hook con estado: qué varita tenés en la mano en Ollivanders y cómo reaccionó.

import { useState } from "react";
import { places } from "@/data/places";
import { spells } from "@/data/spells";
import { getWand, wands } from "@/data/wands";
import { playSfx } from "@/lib/audio/sfx";

// Sonido de cada reacción: la escena muestra el efecto.
const TRIAL_SFX = { vela: "puff", frasco: "glass", estante: "rattle", chispas: "spell" };
const SHAKE_COOLDOWN_MS = 1200;

// Orden de práctica: el mismo en que se usan los hechizos en el recorrido.
const PRACTICE = [...spells].sort((a, b) => places.findIndex((place) => place.id === a.placeId) - places.findIndex((place) => place.id === b.placeId));
const EMPTY = { heldId: null, shaken: false, tried: [], chosenId: null, trial: null, practiced: [] };

// Fases: "browsing" (ninguna varita en la mano), "holding" (una en la mano,
// agitada o no), "practice" (te quedaste con una y practicás cada trazo) y
// "chosen" (ya practicaste). trial ({ wandId, at }) avisa a la escena cada
// vez que una varita reacciona. onPracticed se llama al terminar la práctica
// (o al saltearla): ahí el lugar queda resuelto.
export function useWandShop({ onChoose, onPracticed }) {
  const [state, setState] = useState(EMPTY);
  const held = state.heldId ? getWand(state.heldId) : null;
  const practiceDone = state.practiced.length >= PRACTICE.length;
  const phase = state.chosenId ? (practiceDone ? "chosen" : "practice") : held ? "holding" : "browsing";
  const practiceSpell = phase === "practice" ? PRACTICE[state.practiced.length] : null;

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

  // Un trazo reconocido durante la práctica. Devuelve si era el que tocaba.
  function practice(spellId) {
    if (!practiceSpell || spellId !== practiceSpell.id) return false;
    const practiced = [...state.practiced, spellId];
    setState({ ...state, practiced });
    if (practiced.length >= PRACTICE.length) onPracticed();
    return true;
  }

  // Alternativa accesible: dar la práctica por hecha.
  function skipPractice() {
    if (phase !== "practice") return;
    setState({ ...state, practiced: PRACTICE.map((spell) => spell.id) });
    onPracticed();
  }

  return {
    phase,
    held,
    shaken: state.shaken,
    trial: state.trial,
    practiceSpell,
    practiced: state.practiced,
    practiceOrder: PRACTICE,
    pickBox,
    shake,
    choose,
    practice,
    skipPractice,
    close: () => setState(EMPTY),
  };
}
