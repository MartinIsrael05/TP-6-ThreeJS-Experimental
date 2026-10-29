import { bell, celesta, every, midiToHz, noiseBurst, noiseSource, tone } from "@/lib/audio/synth";

// Ambientes de fondo, uno por lugar. Cada ambiente recibe el AudioContext y
// el nodo de salida (con el fundido ya armado por el motor) y devuelve la
// función que lo apaga. Se arman con capas continuas (drones y colchones de
// ruido filtrado) y eventos sueltos al azar (gotas, chasquidos, latidos).

// Junta fuentes y nodos para apagarlos y desconectarlos de una sola vez.
function collector() {
  const sources = [];
  const nodes = [];
  const timers = [];
  return {
    source(node) {
      sources.push(node);
      nodes.push(node);
      return node;
    },
    node(node) {
      nodes.push(node);
      return node;
    },
    timer(stop) {
      timers.push(stop);
    },
    stop() {
      timers.forEach((stop) => stop());
      sources.forEach((source) => source.stop());
      nodes.forEach((node) => node.disconnect());
    },
  };
}

// Oscilador lento que mueve un parámetro alrededor de su valor.
function lfo(context, bag, param, { rate, depth }) {
  const oscillator = bag.source(context.createOscillator());
  oscillator.frequency.value = rate;
  const amount = bag.node(context.createGain());
  amount.gain.value = depth;
  oscillator.connect(amount).connect(param);
  oscillator.start(context.currentTime + Math.random());
}

// Acorde sostenido de osciladores desafinados apenas, con un filtro que respira.
function drone(context, bag, output, { notes, type = "sawtooth", gain = 0.035, cutoff = 420, breath = 0.07 }) {
  const filter = bag.node(context.createBiquadFilter());
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  lfo(context, bag, filter.frequency, { rate: breath, depth: cutoff * 0.45 });
  const amp = bag.node(context.createGain());
  amp.gain.value = gain;
  filter.connect(amp).connect(output);
  notes.forEach((midi) => {
    [-8, 8].forEach((detune) => {
      const oscillator = bag.source(context.createOscillator());
      oscillator.type = type;
      oscillator.frequency.value = midiToHz(midi);
      oscillator.detune.value = detune;
      oscillator.connect(filter);
      oscillator.start();
    });
  });
}

// Colchón de ruido filtrado: viento, agua, murmullo. sweep mueve el filtro y
// swell la intensidad, cada uno con su velocidad.
function bed(context, bag, output, {
  color = "white",
  filter = "bandpass",
  frequency,
  q = 1,
  gain,
  sweep = 0,
  sweepRate = 0.07,
  swell = 0,
  swellRate = 0.1,
}) {
  const source = bag.source(noiseSource(context, color));
  const biquad = bag.node(context.createBiquadFilter());
  biquad.type = filter;
  biquad.frequency.value = frequency;
  biquad.Q.value = q;
  if (sweep) lfo(context, bag, biquad.frequency, { rate: sweepRate, depth: sweep });
  const amp = bag.node(context.createGain());
  amp.gain.value = gain;
  if (swell) lfo(context, bag, amp.gain, { rate: swellRate, depth: gain * swell });
  source.connect(biquad).connect(amp).connect(output);
  source.start(context.currentTime, Math.random() * 1.5);
}

const pan = () => Math.random() * 1.6 - 0.8;

// Caja de música con una melodía propia en Re menor, en 3/4. Cada nota es
// [midi, pulsos]; el bajo marca el primer pulso de cada compás.
const LULLABY = {
  bpm: 76,
  melody: [
    [74, 1], [72, 1], [69, 1], [70, 1], [69, 1], [67, 1], [69, 1], [65, 1], [62, 1], [64, 3],
    [65, 1], [67, 1], [69, 1], [74, 1.5], [72, 0.5], [70, 1], [69, 1], [67, 1], [64, 1], [62, 3],
  ],
  bass: [50, 43, 50, 45, 53, 46, 45, 50],
  restBeats: 6,
};

// En el final la misma melodía sube a Re mayor: el diario se cerró.
const LULLABY_MAJOR = {
  ...LULLABY,
  bpm: 84,
  melody: LULLABY.melody.map(([midi, beats]) => [midi === 65 ? 66 : midi === 72 ? 73 : midi === 70 ? 71 : midi, beats]),
  bass: [50, 47, 50, 45, 54, 47, 45, 50],
};

// Secuenciador con anticipación: cada 50 ms agenda las notas que caen en los
// próximos 150 ms. Así el ritmo no depende de que setTimeout sea puntual.
function musicBox(context, bag, output, { tune, gain = 0.12, octave = 12 }) {
  const beat = 60 / tune.bpm;
  const events = [];
  let time = 0;
  tune.melody.forEach(([midi, beats]) => {
    events.push({ at: time, midi: midi + octave, gain, voice: "melody" });
    time += beats;
  });
  tune.bass.forEach((midi, bar) => events.push({ at: bar * 3, midi: midi + octave, gain: gain * 0.7, voice: "bass" }));
  events.sort((a, b) => a.at - b.at);
  const loopBeats = time + tune.restBeats;

  let loopStart = context.currentTime + 1.5;
  let cursor = 0;
  const interval = window.setInterval(() => {
    const horizon = context.currentTime + 0.15;
    while (loopStart + events[cursor].at * beat < horizon) {
      const event = events[cursor];
      const when = Math.max(loopStart + event.at * beat, context.currentTime);
      celesta(context, output, {
        frequency: midiToHz(event.midi),
        when,
        gain: event.gain,
        decay: event.voice === "bass" ? 2.4 : 1.4,
        pan: event.voice === "bass" ? -0.2 : 0.2,
      });
      cursor += 1;
      if (cursor === events.length) {
        cursor = 0;
        loopStart += loopBeats * beat;
      }
    }
  }, 50);
  bag.timer(() => window.clearInterval(interval));
}

// Gota que cae en agua: un tono que baja rápido.
function drip(context, output, gain = 0.09) {
  const frequency = 900 + Math.random() * 1300;
  tone(context, output, { frequency, glideTo: frequency * 0.45, decay: 0.16, gain, pan: pan() });
}

// Chasquido de vela o de leña: ruido muy corto y agudo.
function crackle(context, output, gain = 0.05) {
  noiseBurst(context, output, { decay: 0.012 + Math.random() * 0.02, gain: gain * (0.3 + Math.random()), filter: "highpass", frequency: 2500, pan: pan() * 0.6 });
}

// Latido: dos golpes graves.
function heartbeat(context, output, gain = 0.5) {
  const now = context.currentTime;
  tone(context, output, { frequency: 62, glideTo: 40, decay: 0.22, gain, when: now });
  tone(context, output, { frequency: 58, glideTo: 38, decay: 0.28, gain: gain * 0.75, when: now + 0.24 });
}

// Susurro: ráfaga de ruido agudo que va y viene de un costado.
function whisper(context, output, gain = 0.05) {
  noiseBurst(context, output, { attack: 0.5, decay: 1.4, gain, filter: "bandpass", frequency: 3200, sweepTo: 5200, q: 4, pan: pan() });
}

export const AMBIENCES = {
  // Lago de noche: olas, viento, remos y la caja de música.
  prologo(context, output) {
    const bag = collector();
    bed(context, bag, output, { color: "brown", filter: "lowpass", frequency: 520, gain: 0.5, swell: 0.6, swellRate: 0.13 });
    bed(context, bag, output, { frequency: 700, q: 0.6, gain: 0.06, sweep: 300, sweepRate: 0.05, swell: 0.7, swellRate: 0.08 });
    drone(context, bag, output, { notes: [38, 45], type: "triangle", gain: 0.05, cutoff: 300 });
    musicBox(context, bag, output, { tune: LULLABY });
    bag.timer(every(3000, 4200, () => {
      noiseBurst(context, output, { attack: 0.08, decay: 0.5, gain: 0.07, color: "brown", filter: "lowpass", frequency: 900, sweepTo: 300, pan: -0.3 });
    }));
    return bag.stop;
  },

  // Gran Comedor: velas que chisporrotean, murmullo lejano y un acorde tibio.
  "gran-comedor"(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [50, 57, 62], type: "triangle", gain: 0.045, cutoff: 520 });
    bed(context, bag, output, { color: "brown", frequency: 420, q: 1.2, gain: 0.32, swell: 0.5, swellRate: 0.21 });
    bag.timer(every(40, 260, () => crackle(context, output)));
    return bag.stop;
  },

  // Ollivanders: un reloj, polvo y alguna campanita en los estantes.
  ollivanders(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [45, 52, 60], type: "triangle", gain: 0.04, cutoff: 380, breath: 0.05 });
    bed(context, bag, output, { frequency: 5200, q: 0.5, gain: 0.012, swell: 0.8, swellRate: 0.06 });
    let tick = false;
    const clock = window.setInterval(() => {
      tick = !tick;
      noiseBurst(context, output, { decay: 0.03, gain: 0.06, filter: "bandpass", frequency: tick ? 3400 : 2600, q: 6, pan: 0.5 });
    }, 1000);
    bag.timer(() => window.clearInterval(clock));
    bag.timer(every(5000, 11000, () => {
      bell(context, output, { frequency: midiToHz(84 + [0, 3, 7, 10][Math.floor(Math.random() * 4)]), gain: 0.025, pan: pan() });
    }));
    return bag.stop;
  },

  // Torre de las escaleras: viento que sube por el hueco y piedra lejana.
  escaleras(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [33, 40, 45], gain: 0.04, cutoff: 260, breath: 0.04 });
    bed(context, bag, output, { frequency: 520, q: 0.8, gain: 0.12, sweep: 260, sweepRate: 0.06, swell: 0.8, swellRate: 0.09 });
    bag.timer(every(7000, 14000, () => {
      noiseBurst(context, output, { attack: 0.3, decay: 1.6, gain: 0.08, color: "brown", filter: "lowpass", frequency: 260, pan: pan() });
    }));
    return bag.stop;
  },

  // Pasillo inundado: gotas, un acorde menor y voces en las paredes.
  pasillo(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [37, 44, 49, 52], gain: 0.03, cutoff: 300, breath: 0.03 });
    bed(context, bag, output, { color: "brown", filter: "lowpass", frequency: 300, gain: 0.25, swell: 0.4, swellRate: 0.05 });
    // Gotas lejanas: las cercanas las pone la escena, sincronizadas con las ondas.
    bag.timer(every(1200, 3200, () => drip(context, output, 0.04)));
    bag.timer(every(6000, 13000, () => whisper(context, output)));
    return bag.stop;
  },

  // Campo de Quidditch vacío: viento fuerte con ráfagas y lona que flamea.
  quidditch(context, output) {
    const bag = collector();
    bed(context, bag, output, { frequency: 420, q: 0.5, gain: 0.2, sweep: 260, sweepRate: 0.11, swell: 0.9, swellRate: 0.07 });
    bed(context, bag, output, { color: "brown", filter: "lowpass", frequency: 240, gain: 0.35, swell: 0.5, swellRate: 0.05 });
    drone(context, bag, output, { notes: [43, 50, 55], type: "triangle", gain: 0.03, cutoff: 600 });
    bag.timer(every(4000, 9000, () => {
      const now = context.currentTime;
      for (let index = 0; index < 6; index += 1) {
        noiseBurst(context, output, { when: now + index * 0.09, decay: 0.07, gain: 0.04, frequency: 900, q: 1.5, pan: 0.6 });
      }
    }));
    return bag.stop;
  },

  // Sala de trofeos: silencio tenso, un reloj lejano y vitrinas que vibran.
  trofeos(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [36, 43, 46], type: "triangle", gain: 0.035, cutoff: 260, breath: 0.05 });
    bed(context, bag, output, { color: "brown", filter: "lowpass", frequency: 260, gain: 0.18, swell: 0.5, swellRate: 0.06 });
    bag.timer(every(6000, 12000, () => {
      bell(context, output, { frequency: midiToHz(96 + Math.floor(Math.random() * 3)), gain: 0.012, decay: 1.2, pan: pan() });
    }));
    return bag.stop;
  },

  // Cámara de los Secretos: drone grave que late, siseos y un corazón.
  camara(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [26, 26.3, 33], gain: 0.07, cutoff: 200, breath: 0.12 });
    bed(context, bag, output, { filter: "highpass", frequency: 4200, gain: 0.03, swell: 0.95, swellRate: 0.17 });
    bag.timer(every(1050, 1150, () => heartbeat(context, output, 0.35)));
    bag.timer(every(4000, 9000, () => whisper(context, output, 0.07)));
    return bag.stop;
  },

  // Final: la caja de música en mayor sobre un acorde abierto.
  final(context, output) {
    const bag = collector();
    drone(context, bag, output, { notes: [38, 45, 50, 54], type: "triangle", gain: 0.035, cutoff: 700 });
    musicBox(context, bag, output, { tune: LULLABY_MAJOR, gain: 0.14 });
    return bag.stop;
  },
};
