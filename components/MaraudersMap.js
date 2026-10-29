"use client"; // Diálogo con estado, temporizadores, teclado y preferencias de movimiento del navegador.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAP_SIZE, mapPlaces, mapStart, mapTexts, mapWanderers } from "@/data/map";

const START = "start";
// Un paso cada tantas unidades del dibujo, y cuánto tarda en aparecer cada uno.
const STEP_EVERY = 30;
const STEP_MS = 240;
const MIN_TRAVEL_MS = 3400;
const MAX_TRAVEL_MS = 5000;
// Después de llegar, el mapa se queda un rato con tu nombre en el destino.
const ARRIVE_HOLD_MS = 1800;
const CLOSE_MS = 650;

function pointOf(id) {
  return id === START || !id ? mapStart : mapPlaces[id];
}

// Punto de control de la curva de un tramo: el medio, corrido hacia un costado.
function controlOf(from, to, bend = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return { x: (from.x + to.x) / 2 - dy * bend, y: (from.y + to.y) / 2 + dx * bend };
}

function segmentPath(from, to, bend) {
  const control = controlOf(from, to, bend);
  return `M${from.x} ${from.y} Q${control.x} ${control.y} ${to.x} ${to.y}`;
}

// Huellas a lo largo de un tramo curvo (bezier cuadrática), alternando pie
// izquierdo y derecho a los costados de la línea.
function stepsAlong(from, to, bend, reverse = false) {
  const control = controlOf(from, to, bend);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const count = Math.max(3, Math.round(length / STEP_EVERY));
  return Array.from({ length: count }, (_, index) => {
    const raw = (index + 0.5) / count;
    const t = reverse ? 1 - raw : raw;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
    let tx = 2 * u * (control.x - from.x) + 2 * t * (to.x - control.x);
    let ty = 2 * u * (control.y - from.y) + 2 * t * (to.y - control.y);
    if (reverse) {
      tx = -tx;
      ty = -ty;
    }
    const angle = (Math.atan2(ty, tx) * 180) / Math.PI + 90;
    const side = index % 2 ? 1 : -1;
    const norm = Math.hypot(tx, ty) || 1;
    return { x: x + (-ty / norm) * side * 5, y: y + (tx / norm) * side * 5, angle, side };
  });
}

// Huellas del camino entre dos puntos del recorrido, pasando por los del medio.
function journey(route, fromId, toId) {
  const fromIndex = route.indexOf(fromId);
  const toIndex = route.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return [];
  const direction = toIndex > fromIndex ? 1 : -1;
  const steps = [];
  for (let index = fromIndex; index !== toIndex; index += direction) {
    const a = route[index];
    const b = route[index + direction];
    // El tramo se dibuja siempre del anterior al siguiente; para volver se
    // recorre al revés.
    const [first, second] = direction > 0 ? [a, b] : [b, a];
    steps.push(...stepsAlong(pointOf(first), pointOf(second), mapPlaces[second]?.bend, direction < 0));
  }
  return steps;
}

function Footprint({ step, delay, faded }) {
  return (
    <g
      className="map-step"
      transform={`translate(${step.x.toFixed(1)} ${step.y.toFixed(1)}) rotate(${step.angle.toFixed(0)}) scale(${step.side * 1.6} 1.6)`}
      style={{ animationDelay: `${delay}ms`, opacity: faded }}
    >
      <ellipse cx="0" cy="-2.2" rx="2.2" ry="3.4" />
      <ellipse cx="0.3" cy="3.4" rx="1.6" ry="1.8" />
    </g>
  );
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerReducedMotion = () => false;

// Mapa del Merodeador. Muestra el recorrido que el diario ya reveló, dónde
// está cada uno (vos, Filch, Señora Norris, Peeves y el recuerdo de Riddle) y
// deja viajar a los lugares abiertos.
//
// Con travel ({ from, to }) el mapa se abre ya entintado, las huellas caminan
// hasta el destino y al final llama a onArrive: es la transición entre lugares.
export default function MaraudersMap({ places, collected, currentId, travel, playerName, sworn, onSwear, onGo, onArrive, onClose }) {
  const reducedMotion = useSyncExternalStore(subscribeMotion, getReducedMotion, getServerReducedMotion);
  const [closing, setClosing] = useState(false);
  const [arrived, setArrived] = useState(false);
  const firstButtonRef = useRef(null);
  const actionRef = useRef(null);
  const arrivedRef = useRef(false);
  // Las últimas versiones de las funciones, para los temporizadores y el
  // teclado: así no se reinician cada vez que el padre renderiza.
  const latest = useRef({});
  const route = [START, ...places.map((place) => place.id)];
  const inked = sworn || Boolean(travel);
  const hereId = travel ? travel.to : currentId ?? START;
  const herePlace = places.find((place) => place.id === hereId);

  const unlocked = (index) => index === 0 || collected.has(places[index - 1].item.id);

  // Huellas: en un viaje, todo el camino; si no, el último tramo hasta donde
  // estás, más gastadas cuanto más viejas.
  const previousId = route[Math.max(route.indexOf(hereId) - 1, 0)];
  const steps = travel ? journey(route, travel.from ?? START, travel.to) : journey(route, previousId, hereId);
  const stepMs = Math.min(STEP_MS, MAX_TRAVEL_MS / Math.max(steps.length, 1));
  const travelMs = travel && !reducedMotion ? Math.max(MIN_TRAVEL_MS, steps.length * stepMs + 500) : 600;

  function finishTravel() {
    if (arrivedRef.current) return;
    arrivedRef.current = true;
    onArrive();
  }

  function requestClose() {
    if (travel) {
      finishTravel();
      return;
    }
    if (closing) return;
    if (reducedMotion || !inked) {
      onClose();
      return;
    }
    setClosing(true);
  }

  useEffect(() => {
    latest.current = { finishTravel, requestClose, onClose };
  });

  // Viaje: cuando las huellas llegan aparece tu nombre en el destino, y un
  // rato después se entra al lugar.
  const travelling = Boolean(travel);
  const holdMs = reducedMotion ? 300 : ARRIVE_HOLD_MS;
  useEffect(() => {
    if (!travelling) return undefined;
    const arrive = window.setTimeout(() => setArrived(true), travelMs);
    const enter = window.setTimeout(() => latest.current.finishTravel(), travelMs + holdMs);
    return () => {
      window.clearTimeout(arrive);
      window.clearTimeout(enter);
    };
  }, [travelling, travelMs, holdMs]);

  // "Travesura realizada": la tinta se borra y recién ahí se cierra.
  useEffect(() => {
    if (!closing) return undefined;
    const timeout = window.setTimeout(() => latest.current.onClose(), CLOSE_MS);
    return () => window.clearTimeout(timeout);
  }, [closing]);

  // Escape cierra; al cerrar, el foco vuelve a donde estaba.
  useEffect(() => {
    const previous = document.activeElement;
    function onKeyDown(event) {
      if (event.key === "Escape") latest.current.requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  // El foco va al juramento, a saltar el viaje o al primer lugar.
  useEffect(() => {
    (travelling ? actionRef : firstButtonRef).current?.focus();
  }, [inked, travelling]);

  const segments = route.slice(1).map((id, index) => {
    const placeIndex = index;
    const from = pointOf(route[index]);
    const to = pointOf(id);
    const walked = collected.has(places[placeIndex].item.id) || id === hereId || route.indexOf(id) < route.indexOf(hereId);
    return { id, d: segmentPath(from, to, mapPlaces[id].bend), open: unlocked(placeIndex), walked };
  });

  const status = travel
    ? (arrived ? mapTexts.arrived : mapTexts.travelling)(herePlace?.label ?? mapTexts.startLabel)
    : herePlace
      ? mapTexts.here(herePlace.label)
      : mapTexts.start;

  return (
    <div className="map-overlay" role="presentation" onClick={(event) => event.target === event.currentTarget && requestClose()}>
      <section
        className="marauders"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-title"
        data-inked={inked}
        data-closing={closing}
        data-travel={Boolean(travel)}
        data-arrived={arrived}
      >
        <header className="map-header">
          <p className="map-subtitle">{mapTexts.subtitle}</p>
          <h2 id="map-title">{mapTexts.title}</h2>
          <p className="map-status" aria-live="polite">
            {inked ? status : " "}
          </p>
        </header>

        <div className="map-sheet">
          {!inked && (
            <button className="map-oath" ref={firstButtonRef} onClick={onSwear}>
              {mapTexts.oath}
            </button>
          )}

          <div className="map-layer" aria-hidden={!inked}>
            <svg viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`} className="map-drawing" aria-hidden="true">
              <defs>
                <filter id="map-wobble">
                  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" />
                  <feDisplacementMap in="SourceGraphic" scale="4" />
                </filter>
              </defs>

              {/* Castillo, lago, campo y la tienda del recuerdo, a mano alzada. */}
              <g className="map-castle" filter="url(#map-wobble)">
                <path className="map-water" d="M0 455 C 70 430, 190 440, 255 495 S 300 600, 250 640 L0 640 Z" />
                {[490, 520, 550, 580, 610].map((y, index) => (
                  <path key={y} className="map-hatch" d={`M${12 + index * 6} ${y} q 18 -7 36 0 t 36 0 t 36 0`} />
                ))}
                <path d="M250 120 L430 108 L800 110 L822 300 L790 470 L600 500 L420 492 L260 470 L236 300 Z" />
                <path className="map-thin" d="M268 140 L790 132 L802 300 L772 452 L600 480 L420 472 L278 452 L258 300 Z" />
                {[[250, 120, 24], [430, 108, 16], [800, 110, 24], [822, 300, 20], [790, 470, 24], [260, 470, 22]].map(([cx, cy, r]) => (
                  <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
                ))}
                <rect x="296" y="370" width="128" height="72" />
                {[384, 396, 408, 420].map((y) => (
                  <line key={y} className="map-thin" x1="308" y1={y} x2="412" y2={y} />
                ))}
                <circle cx="520" cy="285" r="48" />
                <path className="map-thin" d="M520 285 m-30 0 a30 30 0 1 0 30 -30 a22 22 0 1 0 22 22 a14 14 0 1 0 -14 -14" />
                <path d="M424 400 L478 318" className="map-thin" />
                <rect x="616" y="174" width="150" height="32" />
                <path className="map-thin" d="M560 262 L620 206" />
                <rect x="628" y="362" width="112" height="54" />
                {[640, 664, 688, 712].map((x) => (
                  <rect key={x} className="map-thin" x={x} y="366" width="16" height="8" />
                ))}
                <path className="map-thin" d="M556 318 L628 380" />
                <ellipse cx="880" cy="470" rx="88" ry="50" />
                <ellipse className="map-thin" cx="880" cy="470" rx="20" ry="12" />
                {[-1, 1].map((side) => (
                  <g key={side}>
                    {[-14, 0, 14].map((offset) => (
                      <circle key={offset} className="map-thin" cx={880 + side * 72} cy={470 + offset} r="5" />
                    ))}
                  </g>
                ))}
                <rect className="map-dashed" x="62" y="70" width="236" height="150" rx="6" transform="rotate(-3 180 145)" />
                <path className="map-thin" d="M118 120 L118 200 M150 112 L150 200 M200 112 L200 200 M232 120 L232 200" />
                <circle className="map-dashed" cx="520" cy="565" r="38" />
                <path className="map-thin" d="M496 566 q 8 -12 16 0 t 16 0 t 16 0" />
                <g className="map-compass" transform="translate(930 92)">
                  <circle r="26" className="map-thin" />
                  <path d="M0 -34 L6 0 L0 34 L-6 0 Z" />
                  <path className="map-thin" d="M-34 0 L34 0" />
                </g>
              </g>

              <text className="map-note" x="70" y="600">{mapTexts.startLabel}</text>
              {Object.entries(mapPlaces).map(([id, spot]) =>
                spot.memory || spot.below ? (
                  <text key={id} className="map-note" x={spot.memory ? 74 : spot.x + 46} y={spot.memory ? 92 : spot.y + 30}>
                    {spot.memory ?? spot.below}
                  </text>
                ) : null,
              )}

              {/* El recorrido: solo los tramos que el diario ya reveló. */}
              {segments.map((segment) =>
                segment.open ? (
                  <path key={segment.id} className={`map-route ${segment.walked ? "is-walked" : ""}`} d={segment.d} />
                ) : null,
              )}

              {/* Tus huellas. */}
              <g className="map-steps">
                {steps.map((step, index) => (
                  <Footprint
                    key={`${index}-${step.x}`}
                    step={step}
                    delay={travel && !reducedMotion ? index * stepMs : 0}
                    faded={travel ? 1 : 0.35 + (index / steps.length) * 0.65}
                  />
                ))}
              </g>

              {/* Los demás nombres que se mueven por el castillo. */}
              {mapWanderers.map((wanderer) => {
                const [first, ...rest] = wanderer.path;
                const d = `M${first[0]} ${first[1]} ${rest.map(([x, y]) => `L${x} ${y}`).join(" ")} Z`;
                return (
                  <g key={wanderer.id} className={`map-wanderer ${wanderer.ghost ? "is-ghost" : ""}`} transform={reducedMotion ? `translate(${first[0]} ${first[1]})` : undefined}>
                    {!reducedMotion && <animateMotion dur={`${wanderer.seconds}s`} repeatCount="indefinite" path={d} />}
                    <circle r="4" />
                    <text x="8" y="-6">{wanderer.name}</text>
                  </g>
                );
              })}
            </svg>

            {/* Lugares: botones de verdad sobre el dibujo, para mouse, teclado y la mano. */}
            {places.map((place, index) => {
              const spot = mapPlaces[place.id];
              const here = place.id === hereId;
              // Donde estás siempre se ve, aunque hayas llegado por la URL.
              const open = unlocked(index) || here;
              const done = collected.has(place.item.id);
              const state = here ? "here" : done ? "done" : open ? "open" : "locked";
              return (
                <button
                  key={place.id}
                  className="map-place"
                  data-state={state}
                  style={{ left: `${(spot.x / MAP_SIZE.width) * 100}%`, top: `${(spot.y / MAP_SIZE.height) * 100}%` }}
                  disabled={!inked || !open || Boolean(travel)}
                  onClick={() => (here ? requestClose() : onGo(place.id))}
                  ref={inked && index === 0 ? firstButtonRef : undefined}
                  aria-label={`${place.number}. ${open ? place.label : mapTexts.locked}${done ? ", completado" : ""}${here ? ", estás acá" : ""}`}
                >
                  <b>{place.number}</b>
                  <span>{open ? place.label : mapTexts.locked}</span>
                </button>
              );
            })}

            {/* Tu nombre, como en el mapa de verdad: en un cartelito. */}
            <span
              className="map-you"
              style={{
                left: `${(pointOf(hereId).x / MAP_SIZE.width) * 100}%`,
                top: `${(pointOf(hereId).y / MAP_SIZE.height) * 100}%`,
                animationDelay: travel && !reducedMotion ? `${travelMs - 400}ms` : undefined,
              }}
              aria-hidden="true"
            >
              {playerName || mapTexts.you}
            </span>
          </div>
        </div>

        <div className="map-actions">
          {travel ? (
            <button onClick={finishTravel} ref={actionRef}>
              {arrived ? mapTexts.enter(herePlace?.label ?? mapTexts.startLabel) : mapTexts.skip}
            </button>
          ) : (
            <button onClick={requestClose}>{mapTexts.close}</button>
          )}
        </div>
      </section>
    </div>
  );
}
