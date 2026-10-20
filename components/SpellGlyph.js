// Guía del trazo de un hechizo: la forma dibujándose sola en un loop, con un
// punto donde empieza. No necesita "use client": es SVG estático y la
// animación es CSS.
export default function SpellGlyph({ points, label }) {
  const path = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
  const [startX, startY] = points[0];
  return (
    <svg className="spell-glyph" viewBox="-12 -12 124 124" role="img" aria-label={label}>
      <path className="spell-glyph-ghost" d={path} />
      <path className="spell-glyph-trace" d={path} pathLength="1" />
      <circle cx={startX} cy={startY} r="6" />
    </svg>
  );
}
