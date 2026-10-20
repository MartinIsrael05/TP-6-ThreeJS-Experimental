// Piezas sueltas de síntesis con Web Audio API. Cada función agenda sus nodos
// en un momento (when, en segundos del AudioContext) y los desconecta sola
// cuando terminan de sonar, así no quedan nodos colgados.

// Frecuencia de una nota MIDI (69 es el La de 440 Hz).
export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Ruido blanco o marrón de dos segundos. Se genera una vez por contexto y se
// reusa en loop: generar ruido en cada sonido sería caro.
const noiseBuffers = new WeakMap();

export function noiseBuffer(context, color = "white") {
  let cache = noiseBuffers.get(context);
  if (!cache) {
    cache = {};
    noiseBuffers.set(context, cache);
  }
  if (cache[color]) return cache[color];

  const length = context.sampleRate * 2;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    if (color === "brown") {
      // Ruido marrón: cada muestra se acerca un poco al ruido blanco. Suena
      // grave y redondo, como agua o viento lejano.
      last = (last + 0.02 * white) / 1.02;
      data[index] = last * 3.5;
    } else {
      data[index] = white;
    }
  }
  cache[color] = buffer;
  return buffer;
}

// Fuente de ruido en loop, sin arrancar.
export function noiseSource(context, color = "white") {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, color);
  source.loop = true;
  return source;
}

// Desconecta todos los nodos cuando termina la fuente.
function cleanupOnEnd(source, nodes) {
  source.addEventListener("ended", () => nodes.forEach((node) => node.disconnect()), { once: true });
}

// Envolvente percusiva: sube en attack y cae de forma exponencial en decay.
function percussive(param, when, { attack, decay, peak }) {
  param.setValueAtTime(0.0001, when);
  param.linearRampToValueAtTime(peak, when + attack);
  param.exponentialRampToValueAtTime(0.0001, when + attack + decay);
}

// Nota de un oscilador con envolvente percusiva. glideTo baja o sube la
// frecuencia durante la nota (gotas, golpes).
export function tone(context, destination, {
  frequency,
  type = "sine",
  when = context.currentTime,
  attack = 0.005,
  decay = 0.5,
  gain = 0.3,
  detune = 0,
  glideTo,
  pan = 0,
}) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, when);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, when + attack + decay);
  oscillator.detune.value = detune;

  const amp = context.createGain();
  percussive(amp.gain, when, { attack, decay, peak: gain });

  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  oscillator.connect(amp).connect(panner).connect(destination);
  oscillator.start(when);
  oscillator.stop(when + attack + decay + 0.05);
  cleanupOnEnd(oscillator, [oscillator, amp, panner]);
}

// Ráfaga de ruido filtrado. sweepTo mueve la frecuencia del filtro durante la
// ráfaga (soplidos, roces de papel).
export function noiseBurst(context, destination, {
  when = context.currentTime,
  attack = 0.01,
  decay = 0.3,
  gain = 0.3,
  color = "white",
  filter = "bandpass",
  frequency = 1000,
  q = 1,
  sweepTo,
  pan = 0,
}) {
  const source = noiseSource(context, color);
  const biquad = context.createBiquadFilter();
  biquad.type = filter;
  biquad.frequency.setValueAtTime(frequency, when);
  if (sweepTo) biquad.frequency.exponentialRampToValueAtTime(sweepTo, when + attack + decay);
  biquad.Q.value = q;

  const amp = context.createGain();
  percussive(amp.gain, when, { attack, decay, peak: gain });

  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  source.connect(biquad).connect(amp).connect(panner).connect(destination);
  // Arranca en un punto al azar del buffer para que dos ráfagas no suenen iguales.
  source.start(when, Math.random() * 1.5);
  source.stop(when + attack + decay + 0.05);
  cleanupOnEnd(source, [source, biquad, amp, panner]);
}

// Campana: parciales inarmónicos que se apagan a distinto ritmo.
const BELL_PARTIALS = [
  [1, 1, 1],
  [2.76, 0.5, 0.6],
  [5.4, 0.25, 0.4],
  [8.93, 0.12, 0.25],
];

export function bell(context, destination, { frequency, when = context.currentTime, gain = 0.2, decay = 2.2, pan = 0 }) {
  BELL_PARTIALS.forEach(([ratio, level, length]) => {
    // Los parciales que pasan lo audible no suman nada y el navegador avisa.
    if (frequency * ratio > 18000) return;
    tone(context, destination, { frequency: frequency * ratio, when, gain: gain * level, decay: decay * length, pan });
  });
}

// Celesta o caja de música: fundamental con un armónico brillante que se
// apaga rápido.
export function celesta(context, destination, { frequency, when = context.currentTime, gain = 0.16, decay = 1.6, pan = 0 }) {
  tone(context, destination, { frequency, when, gain, decay, pan });
  tone(context, destination, { frequency: frequency * 4, when, gain: gain * 0.22, decay: decay * 0.18, pan });
  tone(context, destination, { frequency: frequency * 2, when, gain: gain * 0.3, decay: decay * 0.5, pan, detune: 4 });
}

// Nota de bronce: diente de sierra con un filtro que se abre al atacar.
export function brass(context, destination, { frequency, when = context.currentTime, duration = 0.6, gain = 0.12, pan = 0 }) {
  const oscillators = [-6, 6].map((detune) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    return oscillator;
  });
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(frequency * 1.2, when);
  filter.frequency.linearRampToValueAtTime(frequency * 6, when + 0.08);
  filter.frequency.exponentialRampToValueAtTime(frequency * 2, when + duration);

  const amp = context.createGain();
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.linearRampToValueAtTime(gain, when + 0.05);
  amp.gain.setValueAtTime(gain, when + duration * 0.7);
  amp.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.4);

  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  filter.connect(amp).connect(panner).connect(destination);
  oscillators.forEach((oscillator) => {
    oscillator.connect(filter);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.5);
  });
  cleanupOnEnd(oscillators[0], [...oscillators, filter, amp, panner]);
}

// Repite fn a intervalos al azar entre min y max milisegundos. Devuelve la
// función que lo corta.
export function every(minMs, maxMs, fn) {
  let timeout = 0;
  let stopped = false;
  function next() {
    timeout = window.setTimeout(() => {
      if (stopped) return;
      fn();
      next();
    }, minMs + Math.random() * (maxMs - minMs));
  }
  next();
  return () => {
    stopped = true;
    window.clearTimeout(timeout);
  };
}
