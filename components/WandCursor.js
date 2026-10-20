"use client"; // Dibuja en un canvas con requestAnimationFrame y escucha el puntero de toda la página.

import { useEffect, useRef } from "react";

// Estela de chispas que sigue a la varita (el cursor) y un estallido en cada
// click o toque. Es un canvas 2D encima de todo y sin eventos de puntero: no
// tapa nada. El loop corre solo mientras quedan chispas vivas.
const MAX_SPARKS = 180;

export default function WandCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sparks = [];
    let frameId = 0;
    let lastTime = 0;
    let tint = "#e6c766";

    // El dorado de :root cambia con la casa: las chispas toman ese color.
    function readTint() {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--dorado-claro").trim();
      if (value) tint = value;
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function spawn(x, y, count, speed, size, lifetime) {
      for (let index = 0; index < count; index += 1) {
        if (sparks.length >= MAX_SPARKS) sparks.shift();
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.3 + Math.random() * 0.7);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: size * (0.5 + Math.random() * 0.8),
          life: lifetime * (0.6 + Math.random() * 0.6),
          age: 0,
        });
      }
    }

    function tick(time) {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalCompositeOperation = "lighter";

      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.age += delta;
        if (spark.age >= spark.life) {
          sparks.splice(index, 1);
          continue;
        }
        spark.vx *= 0.92;
        spark.vy = spark.vy * 0.92 + 120 * delta; // caen apenas, como brasas
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;

        const fade = 1 - spark.age / spark.life;
        const radius = spark.size * fade;
        context.globalAlpha = fade * 0.55;
        context.fillStyle = tint;
        context.beginPath();
        context.arc(spark.x, spark.y, radius * 2.4, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = fade;
        context.fillStyle = "#fff6d8";
        context.beginPath();
        context.arc(spark.x, spark.y, radius * 0.7, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frameId = sparks.length > 0 ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (frameId) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);
    }

    // Solo el mouse deja estela: con el dedo no hay cursor que seguir.
    function onMove(event) {
      if (event.pointerType !== "mouse" || motionQuery.matches) return;
      spawn(event.clientX, event.clientY, 1 + Math.round(Math.random()), 40, 2.2, 0.6);
      start();
    }

    function onDown(event) {
      if (motionQuery.matches) return;
      readTint();
      spawn(event.clientX, event.clientY, 22, 260, 2.6, 0.7);
      start();
    }

    resize();
    readTint();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="wand-cursor" aria-hidden="true" />;
}
