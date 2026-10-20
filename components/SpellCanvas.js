"use client"; // Escucha el puntero sobre la escena y dibuja el trazo de la varita en un canvas.

import { useEffect, useRef } from "react";
import { spells } from "@/data/spells";
import { createRecognizer } from "@/lib/gestures/recognizer";

// El reconocedor conoce todos los hechizos: así un círculo nunca pasa por
// triángulo aunque el lugar espere un triángulo.
const recognize = createRecognizer(spells.map((spell) => ({ id: spell.id, points: spell.gesture.points })));

// Parecido mínimo (0 a 1) para aceptar el trazo. Una línea suelta da 0.78
// contra la zeta: por debajo de 0.8 no se acepta.
const MIN_SCORE = 0.8;
// Píxeles de arrastre a partir de los cuales es un trazo y no un toque.
const START_DISTANCE = 24;
const FADE_SECONDS = 0.9;

// Canvas transparente encima de la escena 3D. No recibe eventos: escucha los
// del contenedor (.stage), así los toques siguen llegando a la escena. Solo
// dibuja cuando el lugar espera un hechizo (spell). Al soltar, si el trazo se
// parece a la forma del hechizo llama a onCast; si no, a onMiss.
export default function SpellCanvas({ spell, onCast, onMiss }) {
  const canvasRef = useRef(null);
  const propsRef = useRef({ spell, onCast, onMiss });

  useEffect(() => {
    propsRef.current = { spell, onCast, onMiss };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas.parentElement;
    const context = canvas.getContext("2d");
    const fading = [];
    let stroke = null;
    let frameId = 0;
    let lastTime = 0;
    let tint = "#e6c766";
    let rect = canvas.getBoundingClientRect();

    function resize() {
      rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 2);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function point(event) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function drawPath(points, color, width, alpha) {
      if (points.length < 2) return;
      context.globalAlpha = alpha;
      context.strokeStyle = color;
      context.lineWidth = width;
      context.beginPath();
      context.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) context.lineTo(points[index].x, points[index].y);
      context.stroke();
    }

    // Tinta de luz: un halo del color de la casa y un centro blanco.
    function drawInk(points, alpha, ok) {
      context.shadowBlur = 18;
      context.shadowColor = ok === false ? "#6f675c" : tint;
      drawPath(points, ok === false ? "#8a8070" : tint, ok ? 9 : 5, alpha * 0.7);
      context.shadowBlur = 0;
      drawPath(points, ok === false ? "#b8ad98" : "#fff6d8", 1.8, alpha);
    }

    function tick(time) {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      context.clearRect(0, 0, rect.width, rect.height);
      context.lineCap = "round";
      context.lineJoin = "round";
      for (let index = fading.length - 1; index >= 0; index -= 1) {
        const trace = fading[index];
        trace.age += delta;
        if (trace.age >= FADE_SECONDS) fading.splice(index, 1);
        else drawInk(trace.points, 1 - trace.age / FADE_SECONDS, trace.ok);
      }
      if (stroke?.drawing) drawInk(stroke.points, 1, null);
      context.globalAlpha = 1;
      frameId = fading.length > 0 || stroke?.drawing ? requestAnimationFrame(tick) : 0;
    }

    function start() {
      if (frameId) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(tick);
    }

    // Después de un trazo el navegador igual dispara un click: se frena antes
    // de que llegue a la escena para que dibujar no cuente como tocar.
    function swallowNextClick() {
      const stop = (event) => event.stopPropagation();
      stage.addEventListener("click", stop, { capture: true, once: true });
      window.setTimeout(() => stage.removeEventListener("click", stop, { capture: true }), 400);
    }

    function onDown(event) {
      if (!propsRef.current.spell || (event.pointerType === "mouse" && event.button !== 0)) return;
      rect = canvas.getBoundingClientRect();
      tint = getComputedStyle(document.documentElement).getPropertyValue("--dorado-claro").trim() || tint;
      stroke = { id: event.pointerId, points: [point(event)], drawing: false };
    }

    function onMove(event) {
      if (!stroke || event.pointerId !== stroke.id) return;
      const next = point(event);
      stroke.points.push(next);
      const first = stroke.points[0];
      if (!stroke.drawing && Math.hypot(next.x - first.x, next.y - first.y) > START_DISTANCE) {
        stroke.drawing = true;
        start();
      }
    }

    function onUp(event) {
      if (!stroke || event.pointerId !== stroke.id) return;
      const done = stroke;
      stroke = null;
      if (!done.drawing) return;
      swallowNextClick();
      const expected = propsRef.current.spell;
      const result = recognize(done.points);
      const ok = Boolean(expected) && result.id === expected.id && result.score >= MIN_SCORE;
      fading.push({ points: done.points, age: 0, ok });
      start();
      if (ok) propsRef.current.onCast?.(expected);
      else propsRef.current.onMiss?.(result);
    }

    function onCancel() {
      stroke = null;
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onCancel);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  return <canvas ref={canvasRef} className="spell-canvas" aria-hidden="true" />;
}
