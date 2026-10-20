"use client"; // Estado narrativo, navegación con useRouter y eventos del usuario.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getHouse } from "@/data/houses";
import {
  ending as fallbackEnding,
  itemTypeLabels,
  persistenceLabels,
  places,
} from "@/data/places";
import { spells } from "@/data/spells";
import { getWand, wandName } from "@/data/wands";
import { useProgress } from "@/hooks/useProgress";
import { installAudioUnlock, setAmbience } from "@/lib/audio/engine";
import { playSfx } from "@/lib/audio/sfx";
import AuthPanel from "@/components/AuthPanel";
import HandControl from "@/components/HandControl";
import Prologue from "@/components/Prologue";
import SortingHatDialog from "@/components/SortingHatDialog";
import SoundToggle from "@/components/SoundToggle";
import SpellCanvas from "@/components/SpellCanvas";
import SpellGlyph from "@/components/SpellGlyph";
import ThreeArtifact from "@/components/ThreeArtifact";
import WandCursor from "@/components/WandCursor";
import WandDialog from "@/components/WandDialog";

// Lugares que se resuelven con un diálogo HTML en lugar de marcarse directo.
const DIALOG_BY_ITEM = { sombrero: "sorting", varita: "wand" };

// Hechizo que se usa en cada lugar. Se lanza dibujándolo en la escena (la
// escena reacciona y el juego sigue) o con el botón alternativo: en ese caso
// la escena lo anima y después de CAST_MS el lugar queda resuelto.
const SPELL_BY_PLACE = Object.fromEntries(spells.map((spell) => [spell.placeId, spell]));
const CAST_MS = 1800;
const HINT_MS = 3200;

export default function Experience({ initialPlaceId }) {
  const router = useRouter();
  const activeIndex = Math.max(
    places.findIndex((entry) => entry.id === initialPlaceId),
    0,
  );
  const entered = Boolean(initialPlaceId);
  const [flash, setFlash] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [castingPlaceId, setCastingPlaceId] = useState(null);
  const [wandTrial, setWandTrial] = useState(null);
  // El relato se pliega cuando empezás a jugar; se guarda en qué lugar se
  // plegó para que el siguiente arranque abierto.
  const [storyClosedFor, setStoryClosedFor] = useState(null);
  // Último hechizo dibujado ({ placeId, id, at }) y el aviso si el trazo no
  // salió. Llevan el lugar para no arrastrarse al siguiente.
  const [drawnSpell, setDrawnSpell] = useState(null);
  const [hint, setHint] = useState(null);
  const castTimer = useRef(0);
  const finaleTimer = useRef(0);
  const {
    authError,
    authLoading,
    authUser,
    chooseHouse,
    chooseWand,
    continueAsGuest,
    collected,
    collect,
    ending: endingHouseId,
    firebaseConfigured,
    house: houseId,
    learnSpell,
    persistence,
    ready,
    reset,
    setCurrentPlace,
    signInWithGoogle,
    submitEmail,
    wand: wandId,
  } = useProgress();
  const place = places[activeIndex];
  const nextPlace = places[activeIndex + 1];
  const isCollected = collected.has(place.item.id);
  const spell = SPELL_BY_PLACE[place.id];
  const casting = castingPlaceId === place.id;
  const storyOpen = storyClosedFor !== place.id;
  const castHere = drawnSpell?.placeId === place.id ? drawnSpell : null;
  const hintHere = hint?.placeId === place.id ? hint.text : null;
  // El lugar espera que dibujes su hechizo: una vez (once) o cuando quieras.
  const awaitingSpell = Boolean(spell) && !isCollected && !casting && (!spell.once || !castHere);
  const usesDialog = Boolean(DIALOG_BY_ITEM[place.item.id]);
  const alternativeLabel =
    place.action ?? (spell ? `Lanzar ${spell.incantation}` : "Resolver sin la escena 3D");
  const collectedCount = places.filter((entry) =>
    collected.has(entry.item.id),
  ).length;
  const status = persistenceLabels[persistence];
  const house = houseId ? getHouse(houseId) : null;
  const wand = wandId ? getWand(wandId) : null;
  const endingHouse = endingHouseId ? getHouse(endingHouseId) : null;
  const finale = endingHouse
    ? { eyebrow: `Final de ${endingHouse.name}`, ...endingHouse.ending }
    : fallbackEnding;
  const itemDetail =
    place.item.id === "sombrero" && house
      ? house.name
      : place.item.id === "varita" && wand
        ? wandName(wand)
        : null;

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  useEffect(() => {
    if (ready && initialPlaceId) setCurrentPlace(initialPlaceId);
  }, [ready, initialPlaceId, setCurrentPlace]);

  // Si se cambia de lugar con un hechizo en el aire, el hechizo se pierde.
  useEffect(() => () => window.clearTimeout(castTimer.current), [place.id]);
  useEffect(() => () => window.clearTimeout(finaleTimer.current), []);

  useEffect(() => {
    if (!hint) return undefined;
    const timeout = window.setTimeout(() => setHint(null), HINT_MS);
    return () => window.clearTimeout(timeout);
  }, [hint]);

  // El primer gesto en la página desbloquea el audio. Cada lugar tiene su
  // ambiente; con el final abierto suena la caja de música en mayor.
  useEffect(() => installAudioUnlock(), []);

  useEffect(() => {
    setAmbience(completionOpen ? "final" : entered ? place.id : "prologo");
  }, [completionOpen, entered, place.id]);

  // La casa pisa los acentos dorados de todo el sitio (variables de :root).
  useEffect(() => {
    const root = document.documentElement;
    if (house) {
      root.style.setProperty("--dorado", house.color);
      root.style.setProperty("--dorado-claro", house.accent);
      root.dataset.house = house.id;
    } else {
      root.style.removeProperty("--dorado");
      root.style.removeProperty("--dorado-claro");
      delete root.dataset.house;
    }
  }, [house]);

  function completeItem(itemId) {
    if (collected.has(itemId)) return;
    const completesExperience = places.every(
      (entry) => entry.item.id === itemId || collected.has(entry.item.id),
    );

    collect(itemId);
    setFlash(true);
    playSfx("page");
    if (completesExperience) {
      // Primero se ve abrirse la puerta; después se cierra el diario y entra
      // la fanfarria de la casa, cuando las tapas terminan de juntarse.
      const finalHouse = houseId;
      finaleTimer.current = window.setTimeout(() => {
        setCompletionOpen(true);
        finaleTimer.current = window.setTimeout(() => playSfx("fanfare", { house: finalHouse }), 1400);
      }, 2200);
    }
  }

  function handleCollect() {
    if (isCollected || casting) return;
    const dialogId = DIALOG_BY_ITEM[place.item.id];
    if (dialogId) setDialog(dialogId);
    else castSpell();
  }

  // El botón alternativo: suena el hechizo, la escena lo anima (lee casting)
  // y al rato el lugar queda resuelto, haya WebGL o no.
  function castSpell() {
    const itemId = place.item.id;
    setCastingPlaceId(place.id);
    playSfx(spell?.id === "lumos" ? "lumos" : spell ? "spell" : "hiss");
    castTimer.current = window.setTimeout(() => {
      setCastingPlaceId(null);
      completeItem(itemId);
    }, CAST_MS);
  }

  // Trazo reconocido. Los hechizos que se repiten tienen un respiro entre
  // uno y otro para que no se resuelva todo a fuerza de dibujar.
  function handleDrawnSpell(cast) {
    const now = Date.now();
    if (!cast.once && castHere && now - castHere.at < cast.cooldown * 1000) {
      playSfx("fizzle");
      setHint({ placeId: place.id, text: "La varita todavía chisporrotea. Esperá un momento." });
      return;
    }
    playSfx(cast.id === "lumos" ? "lumos" : "spell");
    setDrawnSpell({ placeId: place.id, id: cast.id, at: now });
    setHint(null);
  }

  function handleMissedSpell() {
    playSfx("fizzle");
    setHint({ placeId: place.id, text: `La varita chisporroteó. Probá otra vez: ${spell.gesture.shape}.` });
  }

  // La escena avisa que el puzzle se resolvió jugando.
  function handleSolve() {
    if (!casting) completeItem(place.item.id);
  }

  function handleWandChosen(chosenWandId) {
    chooseWand(chosenWandId);
    spells.forEach((spell) => learnSpell(spell.id));
    completeItem("varita");
  }

  function canOpen(index) {
    return index === 0 || collected.has(places[index - 1].item.id);
  }

  function enterExperience() {
    playSfx("spell");
    router.push(`/castillo/${places[0].id}`);
  }

  function openPlace(placeId) {
    playSfx("whoosh");
    router.push(`/castillo/${placeId}`);
  }

  function returnToStart() {
    router.push("/");
  }

  async function handleReset() {
    setCompletionOpen(false);
    try {
      await reset();
    } finally {
      router.push("/");
    }
  }

  if (!ready) {
    return (
      <main className="loading" role="status" aria-live="polite">
        <span className="loading-flame" aria-hidden="true" />
        <p>Encendiendo las antorchas</p>
      </main>
    );
  }

  return (
    <main
      className={`experience ${flash ? "is-flashing" : ""}`}
      style={{ "--luz": place.color, "--luz-suave": place.accent }}
    >
      <div className="candlelight" aria-hidden="true" />
      <WandCursor />

      {!entered && <Prologue onEnter={enterExperience} />}

      <header className="topbar">
        <button className="brand" onClick={returnToStart}>
          Hogwarts
        </button>
        <div className="status">
          <HandControl />
          <SoundToggle />
          <span
            className={`persistence is-${persistence}`}
            role="status"
            aria-live="polite"
            title={status.hint}
          >
            {status.label}
            <span className="sr-only">: {status.hint}</span>
          </span>
          <span className="progress-count">
            {collectedCount} de {places.length}
            <span className="sr-only"> lugares completados</span>
          </span>
          {firebaseConfigured && (
            <button className="auth-trigger" onClick={() => setAuthOpen(true)}>
              {authUser && !authUser.isAnonymous
                ? authUser.displayName || authUser.email
                : "Tu carta"}
            </button>
          )}
        </div>
      </header>

      {entered && (
        <section className="castle" aria-labelledby="place-title">
          {/* La escena ocupa toda la pantalla; tocarla pliega el relato. */}
          <div className="stage" onPointerDown={() => setStoryClosedFor(place.id)}>
            <ThreeArtifact
              key={place.id}
              place={place}
              discovered={isCollected}
              casting={casting}
              onDiscover={handleCollect}
              onSolve={handleSolve}
              house={houseId}
              trial={wandTrial}
              spellCast={castHere}
            />
            <SpellCanvas
              spell={awaitingSpell ? spell : null}
              onCast={handleDrawnSpell}
              onMiss={handleMissedSpell}
            />
          </div>

          <nav className="place-nav hud" aria-label="Lugares del castillo">
            <ol>
              {places.map((entry, index) => {
                const unlocked = canOpen(index);
                const done = collected.has(entry.item.id);
                const state = done ? "done" : unlocked ? "open" : "locked";
                const stateText = done
                  ? ", completado"
                  : unlocked
                    ? ""
                    : ", bloqueado";
                return (
                  <li key={entry.id}>
                    <button
                      className={index === activeIndex ? "active" : ""}
                      data-state={state}
                      disabled={!unlocked}
                      onClick={() => openPlace(entry.id)}
                      aria-current={index === activeIndex ? "page" : undefined}
                      aria-label={`${entry.number}. ${entry.label}${stateText}`}
                      title={entry.label}
                    >
                      <b>{entry.number}</b>
                      <span>{entry.label}</span>
                      <i aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ol>
            <button className="reset-progress" onClick={handleReset}>
              Empezar de nuevo
            </button>
          </nav>

          <article className={`narrative hud ${storyOpen ? "" : "is-collapsed"}`}>
            <p className="place-eyebrow">{place.eyebrow}</p>
            <h2 id="place-title">{place.title}</h2>
            <p className="place-copy" id="place-copy" hidden={!storyOpen}>
              {place.copy}
            </p>
            <button
              className="story-toggle"
              aria-expanded={storyOpen}
              aria-controls="place-copy"
              onClick={() => setStoryClosedFor(storyOpen ? place.id : null)}
            >
              {storyOpen ? "Plegar el relato" : "Leer el relato"}
            </button>
          </article>

          {/* Abajo: la página del diario a la izquierda y la instrucción a la
              derecha (en el celular, una arriba de la otra). */}
          <div className="hud-bottom">
          <div
            className={`diary-page ${isCollected ? "found" : ""}`}
            aria-live="polite"
          >
            <small>{itemTypeLabels[place.item.type]}</small>
            <strong>
              {isCollected ? place.item.label : "Todavía en blanco"}
              {isCollected && itemDetail && <span>{itemDetail}</span>}
            </strong>
          </div>

          <div className="artifact-caption hud">
            {isCollected ? (
              <p>
                {nextPlace
                  ? `Listo. El diario ya marca el camino a ${nextPlace.label}.`
                  : "Listo. No queda ningún lugar por recorrer."}
              </p>
            ) : awaitingSpell && spell.once ? (
              <div className="spell-prompt">
                <SpellGlyph points={spell.gesture.points} label={`Forma de ${spell.incantation}: ${spell.gesture.shape}`} />
                <p>{spell.prompt}</p>
              </div>
            ) : (
              <p>{place.instruction}</p>
            )}
            {!isCollected && spell && !spell.once && (
              <div className="spell-prompt is-small">
                <SpellGlyph points={spell.gesture.points} label={`Forma de ${spell.incantation}: ${spell.gesture.shape}`} />
                <p>{spell.prompt}</p>
              </div>
            )}
            {hintHere && (
              <p className="spell-hint" role="status">
                {hintHere}
              </p>
            )}
            {!isCollected && usesDialog && (
              <button onClick={handleCollect}>{alternativeLabel}</button>
            )}
            {/* Alternativa accesible a la escena 3D: resuelve el lugar con un botón. */}
            {!isCollected && !usesDialog && (
              <details className="hud-alt">
                <summary>Resolver sin la escena 3D</summary>
                <button onClick={handleCollect} disabled={casting}>
                  {alternativeLabel}
                </button>
              </details>
            )}
            {isCollected && nextPlace && (
              <button onClick={() => openPlace(nextPlace.id)}>
                Ir a {nextPlace.label}
              </button>
            )}
          </div>
          </div>
        </section>
      )}

      {completionOpen && (
        <section
          className="completion"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
          style={{
            "--casa": endingHouse?.color ?? "var(--dorado)",
            "--casa-clara": endingHouse?.accent ?? "var(--dorado-claro)",
          }}
        >
          <button
            className="close"
            onClick={() => setCompletionOpen(false)}
            aria-label="Cerrar el final"
          >
            ×
          </button>
          {/* El diario se cierra y la tinta se apaga, en el color de la casa. */}
          <div className="completion-diary" aria-hidden="true">
            <span className="diary-cover is-left" />
            <span className="diary-cover is-right" />
            <span className="diary-glow" />
          </div>
          <p className="completion-eyebrow">{finale.eyebrow}</p>
          <h2 id="completion-title">{finale.title}</h2>
          <p className="completion-copy">{finale.copy}</p>
          <div className="completion-actions">
            <button onClick={() => setCompletionOpen(false)}>
              Seguir en el castillo
            </button>
            <button onClick={handleReset}>Empezar de nuevo</button>
          </div>
        </section>
      )}

      {dialog === "sorting" && (
        <SortingHatDialog
          onSorted={chooseHouse}
          onDone={() => {
            setDialog(null);
            completeItem("sombrero");
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === "wand" && (
        <WandDialog
          onTry={(trialWandId) => setWandTrial({ wandId: trialWandId, at: Date.now() })}
          onChoose={handleWandChosen}
          onClose={() => setDialog(null)}
        />
      )}

      {authOpen && (
        <AuthPanel
          authError={authError}
          authLoading={authLoading}
          onClose={() => setAuthOpen(false)}
          onContinueAsGuest={continueAsGuest}
          onGoogle={signInWithGoogle}
          onSubmitEmail={submitEmail}
          user={authUser}
        />
      )}
    </main>
  );
}
