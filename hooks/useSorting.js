"use client"; // Hook con estado y temporizadores: la selección del Sombrero pregunta por pregunta.

import { useEffect, useState } from "react";
import { sortIntoHouse, sorting } from "@/data/sorting";
import { playSfx } from "@/lib/audio/sfx";

// Lo que tarda el Sombrero en decidir: dura lo mismo que el redoble.
const THINKING_MS = 1700;

// Fases: null (sin empezar), "asking" (pregunta en curso), "thinking"
// (redoble) y "revealed" (casa anunciada). onSorted guarda la casa apenas
// se calcula; el anuncio llega después del redoble.
export function useSorting({ onSorted }) {
  const [state, setState] = useState(null);
  const total = sorting.questions.length;
  const houseId = state?.houseId ?? null;
  const phase = !state ? null : houseId ? (state.revealed ? "revealed" : "thinking") : "asking";
  const question = phase === "asking" ? sorting.questions[state.answers.length] : null;

  useEffect(() => {
    if (phase !== "thinking") return undefined;
    playSfx("drumroll");
    const timeout = window.setTimeout(() => {
      setState((current) => ({ ...current, revealed: true }));
      playSfx("fanfare", { house: houseId });
    }, THINKING_MS);
    return () => window.clearTimeout(timeout);
  }, [phase, houseId]);

  function pick(answerId) {
    const answer = question?.answers.find((item) => item.id === answerId);
    if (!answer) return;
    const answers = [...state.answers, answer.house];
    playSfx("align", { step: answers.length * 2 });
    if (answers.length < total) {
      setState({ ...state, answers });
      return;
    }
    const sorted = sortIntoHouse(answers);
    onSorted(sorted);
    setState({ answers, houseId: sorted, revealed: false });
  }

  return {
    phase,
    question,
    step: (state?.answers.length ?? 0) + 1,
    total,
    houseId,
    start: () => setState({ answers: [], houseId: null, revealed: false }),
    pick,
    close: () => setState(null),
  };
}
