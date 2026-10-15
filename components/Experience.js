"use client"; // Estado narrativo, navegación con useRouter y eventos del usuario.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getHouse } from "@/data/houses";
import {
  ending as fallbackEnding,
  itemTypeLabels,
  persistenceLabels,
  places,
  prologue,
} from "@/data/places";
import { spells } from "@/data/spells";
import { getWand, wandName } from "@/data/wands";
import { useProgress } from "@/hooks/useProgress";
import AuthPanel from "@/components/AuthPanel";
import SortingHatDialog from "@/components/SortingHatDialog";
import ThreeArtifact from "@/components/ThreeArtifact";
import WandDialog from "@/components/WandDialog";

// Lugares que se resuelven con un diálogo HTML en lugar de marcarse directo.
const DIALOG_BY_ITEM = { sombrero: "sorting", varita: "wand" };

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
    if (completesExperience) setCompletionOpen(true);
  }

  function handleCollect() {
    if (isCollected) return;
    const dialogId = DIALOG_BY_ITEM[place.item.id];
    if (dialogId) setDialog(dialogId);
    else completeItem(place.item.id);
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
    router.push(`/castillo/${places[0].id}`);
  }

  function openPlace(placeId) {
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

      {!entered && (
        <section className="intro" aria-labelledby="intro-title">
          <h1 id="intro-title">{prologue.title}</h1>
          <p className="intro-copy">{prologue.copy}</p>
          <button className="enter-button" onClick={enterExperience}>
            {prologue.cta}
          </button>
          <p className="intro-note">{prologue.note}</p>
        </section>
      )}

      <header className="topbar">
        <button className="brand" onClick={returnToStart}>
          Hogwarts
        </button>
        <div className="status">
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

      <section className="place-layout">
        <nav className="place-nav" aria-label="Lugares del castillo">
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

        <article className="narrative">
          <p className="place-eyebrow">{place.eyebrow}</p>
          <h2>{place.title}</h2>
          <p className="place-copy">{place.copy}</p>

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
        </article>

        <div className="artifact-panel">
          <ThreeArtifact
            key={place.id}
            place={place}
            discovered={isCollected}
            onDiscover={handleCollect}
            house={houseId}
          />
          <div className="artifact-caption">
            <p>
              {isCollected
                ? nextPlace
                  ? `Listo. El diario ya marca el camino a ${nextPlace.label}.`
                  : "Listo. No queda ningún lugar por recorrer."
                : place.instruction}
            </p>
            {!isCollected && (
              <button onClick={handleCollect}>
                {place.action ?? "Resolver sin la escena 3D"}
              </button>
            )}
            {isCollected && nextPlace && (
              <button onClick={() => openPlace(nextPlace.id)}>
                Ir a {nextPlace.label}
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="footer-bar">
        <span>Programación Multimedial III, UMAI</span>
      </footer>

      {completionOpen && (
        <section
          className="completion"
          role="dialog"
          aria-modal="true"
          aria-labelledby="completion-title"
        >
          <button
            className="close"
            onClick={() => setCompletionOpen(false)}
            aria-label="Cerrar el final"
          >
            ×
          </button>
          <p className="completion-eyebrow">{finale.eyebrow}</p>
          <h2 id="completion-title">{finale.title}</h2>
          <p>{finale.copy}</p>
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
