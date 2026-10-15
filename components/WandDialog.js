"use client"; // Diálogo con estado (varita elegida) que usa la API de <dialog> del navegador.

import { useEffect, useRef, useState } from "react";
import { getPlace } from "@/data/places";
import { spells } from "@/data/spells";
import { getWand, wandName, wands, wandShop } from "@/data/wands";

// onChoose guarda la varita, enseña los hechizos y marca el ítem al confirmar.
export default function WandDialog({ onChoose, onClose }) {
  const dialogRef = useRef(null);
  const [selected, setSelected] = useState("");
  const [chosenId, setChosenId] = useState(null);
  const chosen = chosenId ? getWand(chosenId) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  function closeDialog() {
    dialogRef.current.close();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!getWand(selected)) return;
    setChosenId(selected);
    onChoose(selected);
  }

  return (
    <dialog
      ref={dialogRef}
      className="paper-dialog"
      aria-labelledby="wand-title"
      onClose={onClose}
    >
      <button className="dialog-close" onClick={closeDialog} aria-label="Cerrar">
        ×
      </button>
      <p className="dialog-eyebrow">Un recuerdo del diario</p>
      <h2 id="wand-title">{wandShop.title}</h2>

      {chosen ? (
        <div className="wand-result">
          <p className="wand-chosen">{wandName(chosen)}</p>
          <p>{wandShop.learned}</p>
          <ul className="spell-list">
            {spells.map((spell) => (
              <li key={spell.id}>
                <strong>{spell.incantation}</strong>
                <span>
                  {spell.name}. {spell.description} Se usa en:{" "}
                  {getPlace(spell.placeId).label}.
                </span>
              </li>
            ))}
          </ul>
          <button className="dialog-primary" onClick={closeDialog} autoFocus>
            {wandShop.close}
          </button>
        </div>
      ) : (
        <>
          <p className="dialog-intro">{wandShop.intro}</p>
          <form onSubmit={handleSubmit}>
            <fieldset className="dialog-choices">
              <legend className="sr-only">Elegí una varita</legend>
              {wands.map((wand) => (
                <label key={wand.id} className="choice">
                  <input
                    type="radio"
                    name="varita"
                    value={wand.id}
                    checked={selected === wand.id}
                    onChange={() => setSelected(wand.id)}
                  />
                  <span>
                    <b>{wandName(wand)}</b>
                    {wand.description}
                  </span>
                </label>
              ))}
            </fieldset>
            <button className="dialog-primary" type="submit" disabled={!selected}>
              {wandShop.confirm}
            </button>
          </form>
        </>
      )}
    </dialog>
  );
}
