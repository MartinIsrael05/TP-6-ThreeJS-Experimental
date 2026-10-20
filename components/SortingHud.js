import { sorting as sortingText } from "@/data/sorting";

// Panel flotante del Sombrero: la pregunta en curso (las respuestas están en
// la escena, como pergaminos), el redoble y el anuncio de la casa.
// No necesita "use client": no tiene estado propio y se usa desde
// Experience, que ya es Client Component.
export default function SortingHud({ sorting, house, onFinish }) {
  const { phase, question, step, total } = sorting;

  return (
    <section className="sorting-hud hud" aria-live="polite" aria-label={sortingText.title}>
      {phase === "asking" && (
        <>
          <button className="sorting-close" onClick={sorting.close} aria-label="Sacarme el Sombrero">
            ×
          </button>
          <p className="sorting-step">
            {sortingText.title} · pregunta {step} de {total}
          </p>
          <h3>{question.text}</h3>
          <p className="sorting-help">Señalá un pergamino con la varita y sostené, o tocalo.</p>
          <details className="hud-alt">
            <summary>Responder sin la escena 3D</summary>
            <div className="sorting-alt">
              {question.answers.map((answer) => (
                <button key={answer.id} onClick={() => sorting.pick(answer.id)}>
                  {answer.text}
                </button>
              ))}
            </div>
          </details>
        </>
      )}

      {phase === "thinking" && <p className="hat-thinking">{sortingText.thinking}</p>}

      {phase === "revealed" && house && (
        <div className="house-result is-revealed" style={{ "--house-color": house.accent }}>
          <p>{sortingText.result}</p>
          <p className="house-name">{house.name}</p>
          <p>{house.trait}</p>
          <button className="sorting-confirm" onClick={onFinish} autoFocus>
            {sortingText.confirm}
          </button>
        </div>
      )}
    </section>
  );
}
