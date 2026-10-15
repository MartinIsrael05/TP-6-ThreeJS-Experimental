"use client"; // Next exige que los límites de error sean Client Components.

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="fallback">
      <p className="fallback-eyebrow">Algo salió mal</p>
      <h1>Un hechizo rebotó contra la pared.</h1>
      <p>
        Esta parte del castillo no se pudo cargar. Tu progreso sigue guardado:
        probá de nuevo o volvé a la entrada.
      </p>
      <div className="fallback-actions">
        <button type="button" onClick={() => retry()}>
          Probar de nuevo
        </button>
        <Link href="/">Volver a la entrada</Link>
      </div>
    </main>
  );
}
