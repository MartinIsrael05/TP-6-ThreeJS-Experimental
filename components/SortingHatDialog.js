"use client"; // Diálogo con estado (pregunta actual y respuestas) que usa la API de <dialog> del navegador.

import { useEffect, useRef, useState } from "react";
import { getHouse } from "@/data/houses";
import { sortIntoHouse, sorting } from "@/data/sorting";

// onSorted guarda la casa apenas se calcula; onDone se llama al cerrar el
// diálogo con la casa ya asignada, y onClose si se cierra antes de terminar.
export default function SortingHatDialog({ onSorted, onDone, onClose }) {
  const dialogRef = useRef(null);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState("");
  const [houseId, setHouseId] = useState(null);
  const total = sorting.questions.length;
  const question = sorting.questions[answers.length];
  const house = houseId ? getHouse(houseId) : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  function closeDialog() {
    dialogRef.current.close();
  }

  function handleClose() {
    if (houseId) onDone();
    else onClose();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const answer = question.answers.find((item) => item.id === selected);
    if (!answer) return;

    const nextAnswers = [...answers, answer.house];
    setAnswers(nextAnswers);
    setSelected("");

    if (nextAnswers.length === total) {
      const sortedHouse = sortIntoHouse(nextAnswers);
      setHouseId(sortedHouse);
      onSorted(sortedHouse);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="paper-dialog"
      aria-labelledby="sorting-title"
      onClose={handleClose}
    >
      <button className="dialog-close" onClick={closeDialog} aria-label="Cerrar">
        ×
      </button>
      <p className="dialog-eyebrow">Gran Comedor</p>
      <h2 id="sorting-title">{sorting.title}</h2>

      {house ? (
        <div className="house-result" style={{ "--house-color": house.color }}>
          <p>{sorting.result}</p>
          <p className="house-name">{house.name}</p>
          <p>{house.trait}</p>
          <button className="dialog-primary" onClick={closeDialog} autoFocus>
            {sorting.confirm}
          </button>
        </div>
      ) : (
        <>
          {answers.length === 0 && <p className="dialog-intro">{sorting.intro}</p>}
          <form onSubmit={handleSubmit} key={question.id}>
            <fieldset className="dialog-choices">
              <legend>
                <small>
                  Pregunta {answers.length + 1} de {total}
                </small>
                {question.text}
              </legend>
              {question.answers.map((answer) => (
                <label key={answer.id} className="choice">
                  <input
                    type="radio"
                    name={question.id}
                    value={answer.id}
                    checked={selected === answer.id}
                    onChange={() => setSelected(answer.id)}
                  />
                  <span>{answer.text}</span>
                </label>
              ))}
            </fieldset>
            <button className="dialog-primary" type="submit" disabled={!selected}>
              {answers.length + 1 === total ? "Escuchar al Sombrero" : "Siguiente"}
            </button>
          </form>
        </>
      )}
    </dialog>
  );
}
