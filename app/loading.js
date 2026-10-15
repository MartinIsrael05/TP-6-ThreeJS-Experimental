export default function Loading() {
  return (
    <main className="loading" role="status" aria-live="polite">
      <span className="loading-flame" aria-hidden="true" />
      <p>Encendiendo las antorchas</p>
    </main>
  );
}
