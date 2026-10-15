"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { places } from "@/data/places";
import { useProgress } from "@/hooks/useProgress";
import AuthPanel from "@/components/AuthPanel";
import ThreeArtifact from "@/components/ThreeArtifact";

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
  const {
    authError,
    authLoading,
    authUser,
    continueAsGuest,
    collected,
    collect,
    firebaseConfigured,
    ready,
    reset,
    signInWithGoogle,
    submitEmail,
    syncState,
  } = useProgress();
  const place = places[activeIndex];
  const isCollected = collected.has(place.item.id);
  const collectedCount = places.filter((entry) =>
    collected.has(entry.item.id),
  ).length;

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(false), 650);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  function handleCollect() {
    if (isCollected) return;
    const completesExperience = places.every(
      (entry) => entry.item.id === place.item.id || collected.has(entry.item.id),
    );

    collect(place.item.id);
    setFlash(true);
    if (completesExperience) setCompletionOpen(true);
  }

  function canOpen(index) {
    return index === 0 || collected.has(places[index - 1].item.id);
  }

  function enterExperience() {
    router.push(`/archivo/${places[0].id}`);
  }

  function openPlace(placeId) {
    router.push(`/archivo/${placeId}`);
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

  if (!ready) return <main className="loading">SINTONIZANDO…</main>;

  return (
    <main className={`experience ${flash ? "is-flashing" : ""}`}>
      <div className="noise" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />

      {!entered && (
        <section className="intro">
          <p className="kicker">ARCHIVO NO AUTORIZADO / EXP. 06</p>
          <h1>
            SEÑAL <span>88</span>
          </h1>
          <p className="intro-copy">
            Una transmisión apareció donde no debía. Tres fragmentos siguen
            activos. Entrar altera el archivo.
          </p>
          <button className="enter-button" onClick={enterExperience}>
            <span>INICIAR RECEPCIÓN</span>
            <span aria-hidden="true">↗</span>
          </button>
          <p className="microcopy">Usá auriculares. O fingí que este mensaje los recomendaba.</p>
        </section>
      )}

      <header className="topbar">
        <button className="brand" onClick={returnToStart}>
          S/88 <i>●</i>
        </button>
        <div className="status">
          <span>{syncState === "cloud" ? "NUBE" : "LOCAL"}</span>
          <span>SEÑAL {Math.round((collectedCount / places.length) * 100)}%</span>
          {firebaseConfigured && (
            <button className="auth-trigger" onClick={() => setAuthOpen(true)}>
              {authUser?.isAnonymous
                ? "INVITADO"
                : authUser?.displayName || authUser?.email || "ACCEDER"}
            </button>
          )}
        </div>
      </header>

      <section className="chapter-layout" style={{ "--signal": place.color }}>
        <aside className="chapter-nav" aria-label="Fragmentos de la transmisión">
          {places.map((entry, index) => {
            const unlocked = canOpen(index);
            return (
              <button
                key={entry.id}
                className={index === activeIndex ? "active" : ""}
                disabled={!unlocked}
                onClick={() => openPlace(entry.id)}
                aria-label={`${entry.label}${unlocked ? "" : " bloqueado"}`}
              >
                <b>{entry.number}</b>
                <span>{entry.label}</span>
                <i>{collected.has(entry.item.id) ? "◆" : unlocked ? "◇" : "×"}</i>
              </button>
            );
          })}
          <button className="reset-progress" onClick={handleReset}>
            <b>↺</b>
            <span>REINICIAR PROGRESO</span>
            <i>×</i>
          </button>
        </aside>

        <div className="narrative">
          <p className="kicker">{place.eyebrow}</p>
          <p className="chapter-number">FRAGMENTO {place.number}</p>
          <h2>{place.title}</h2>
          <p className="chapter-copy">{place.copy}</p>

          <div className={`clue-card ${isCollected ? "found" : ""}`}>
            <small>{isCollected ? "EVIDENCIA RECUPERADA" : "EVIDENCIA CIFRADA"}</small>
            <strong>{isCollected ? place.item.label : "██████ ████"}</strong>
          </div>
        </div>

        <div className="artifact-panel">
          <ThreeArtifact
            key={place.id}
            place={place}
            discovered={isCollected}
            onDiscover={handleCollect}
          />
          <div className="artifact-caption">
            <span>[ OBJETO {place.number} ]</span>
            <p>{isCollected ? "Frecuencia aislada." : place.instruction}</p>
            {!isCollected && (
              <button onClick={handleCollect}>INSPECCIONAR NÚCLEO</button>
            )}
          </div>
        </div>
      </section>

      <footer className="footer-bar">
        <span>UMAI / PROGRAMACIÓN III</span>
        <span>{new Date().toLocaleDateString("es-AR")}</span>
      </footer>

      {completionOpen && (
        <section className="completion" role="dialog" aria-modal="true">
          <button
            className="close"
            onClick={() => setCompletionOpen(false)}
            aria-label="Cerrar desenlace"
          >
            ×
          </button>
          <p className="kicker">TRANSMISIÓN RECONSTRUIDA</p>
          <h2>NO ERA UN ECO.<br />ERA UNA INVITACIÓN.</h2>
          <p>Fin del prototipo. La transmisión fue reconstruida por completo.</p>
        </section>
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
