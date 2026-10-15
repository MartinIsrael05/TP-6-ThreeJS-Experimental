import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fallback">
      <p className="fallback-eyebrow">Página no encontrada</p>
      <h1>Este pasillo no figura en ningún mapa.</h1>
      <p>
        Puede que las escaleras se hayan movido. Volvé a la entrada y seguí el
        diario desde ahí.
      </p>
      <div className="fallback-actions">
        <Link href="/">Volver a la entrada</Link>
      </div>
    </main>
  );
}
