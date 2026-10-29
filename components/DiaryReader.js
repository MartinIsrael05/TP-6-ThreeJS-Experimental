"use client"; // Lee el progreso guardado (localStorage o Firebase) para saber si la página ya es tuya.

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { diaryEntries, diaryTexts } from "@/data/diary";
import { getPlace } from "@/data/places";
import { useProgress } from "@/hooks/useProgress";
import { beginTransition, markSceneReady } from "@/lib/transition";

// Una página del diario de Riddle. Si todavía no la conseguiste, se ve en
// blanco y te dice dónde está; si ya es tuya, la tinta aparece renglón por
// renglón.
export default function DiaryReader({ entry }) {
  const router = useRouter();
  const { collected, currentPlace, ready, settled } = useProgress();
  const found = collected.has(entry.itemId);
  const waiting = !ready || (!found && !settled);
  const index = diaryEntries.indexOf(entry);
  const previous = diaryEntries[index - 1];
  const next = diaryEntries[index + 1];
  const foundPlace = getPlace(entry.placeId);
  const backPlace = getPlace(currentPlace) ?? foundPlace;

  // No hay escena 3D: apenas se sabe qué mostrar, se levanta el velo.
  useEffect(() => {
    if (!waiting) markSceneReady();
  }, [waiting]);

  function goToPlace(place) {
    beginTransition({ number: place.number, label: place.label, eyebrow: place.eyebrow, color: place.color }, () => router.push(`/castillo/${place.id}`));
  }

  if (waiting) {
    return (
      <main className="loading" role="status" aria-live="polite">
        <span className="loading-flame" aria-hidden="true" />
        <p>Buscando la página</p>
      </main>
    );
  }

  return (
    <main className="diary-view">
      <article className={`diary-sheet ${found ? "is-found" : "is-missing"}`} aria-labelledby="diary-title">
        <p className="diary-eyebrow">{diaryTexts.eyebrow(entry.number, diaryEntries.length)}</p>
        {found ? (
          <>
            <p className="diary-date">{entry.date}</p>
            <h1 id="diary-title">{entry.title}</h1>
            {entry.lines.map((line, lineIndex) => (
              <p key={line} className="diary-line" style={{ animationDelay: `${0.6 + lineIndex * 0.9}s` }}>
                {line}
              </p>
            ))}
            <p className="diary-signature" style={{ animationDelay: `${0.6 + entry.lines.length * 0.9}s` }}>
              {diaryTexts.signature}
            </p>
            <p className="diary-found">{diaryTexts.foundIn(foundPlace.label)}</p>
          </>
        ) : (
          <>
            <h1 id="diary-title">{diaryTexts.missingTitle}</h1>
            <p className="diary-found">{diaryTexts.missingCopy(foundPlace.label)}</p>
          </>
        )}
      </article>

      <nav className="diary-nav" aria-label="Páginas del diario">
        {previous ? (
          <Link href={`/diario/${previous.number}`}>{diaryTexts.previous}</Link>
        ) : (
          <span />
        )}
        <button onClick={() => goToPlace(found ? backPlace : foundPlace)}>
          {found ? diaryTexts.back : diaryTexts.goFind(foundPlace.label)}
        </button>
        {next ? <Link href={`/diario/${next.number}`}>{diaryTexts.next}</Link> : <span />}
      </nav>
    </main>
  );
}
