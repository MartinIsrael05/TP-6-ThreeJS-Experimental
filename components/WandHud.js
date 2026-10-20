import SpellGlyph from "@/components/SpellGlyph";
import { getPlace } from "@/data/places";
import { spells } from "@/data/spells";
import { wandName, wands, wandShop } from "@/data/wands";

// Panel flotante de Ollivanders: la varita que tenés en la mano, cómo
// reaccionó al agitarla y, cuando te quedás con una, los hechizos que
// aprendés con la forma de cada trazo.
// No necesita "use client": no tiene estado propio y se usa desde
// Experience, que ya es Client Component.
export default function WandHud({ shop }) {
  const { phase, held, shaken } = shop;
  if (phase === "browsing") return null;

  return (
    <section className="wand-hud hud" aria-live="polite" aria-label={wandShop.title}>
      {phase === "holding" && (
        <>
          <p className="sorting-step">{wandShop.title}</p>
          <h3>{wandName(held)}</h3>
          <p className="wand-description">{held.description}</p>
          {shaken ? (
            <>
              <p className="wand-reaction">{wandShop.reactions[held.trial]}</p>
              <button className="sorting-confirm" onClick={shop.choose}>
                {wandShop.confirm}
              </button>
              <p className="sorting-help">{wandShop.another}</p>
            </>
          ) : (
            <p className="sorting-help">{wandShop.shake}</p>
          )}
          {/* Alternativa accesible: probar cualquier varita sin agitar. */}
          <details className="hud-alt">
            <summary>Probar sin agitar</summary>
            <div className="sorting-alt">
              {wands.map((wand) => (
                <button key={wand.id} onClick={() => shop.shake(wand.id)}>
                  {wandName(wand)}
                </button>
              ))}
            </div>
          </details>
        </>
      )}

      {phase === "chosen" && (
        <>
          <p className="sorting-step">{wandShop.title}</p>
          <h3>{wandName(held)}</h3>
          <p className="wand-description">{wandShop.learned}</p>
          <ul className="spell-list">
            {spells.map((spell) => (
              <li key={spell.id}>
                <SpellGlyph points={spell.gesture.points} label={`Forma de ${spell.incantation}: ${spell.gesture.shape}`} />
                <span>
                  <strong>{spell.incantation}</strong>
                  {spell.gesture.shape}. Se usa en {getPlace(spell.placeId).label}.
                </span>
              </li>
            ))}
          </ul>
          <button className="sorting-confirm" onClick={shop.close} autoFocus>
            {wandShop.close}
          </button>
        </>
      )}
    </section>
  );
}
