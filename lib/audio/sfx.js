import { getAudio } from "@/lib/audio/engine";
import { bell, brass, celesta, midiToHz, noiseBurst, tone } from "@/lib/audio/synth";

// Efectos de sonido con nombre. playSfx no hace nada si el audio todavía no
// se desbloqueó o está en silencio, así que se puede llamar desde cualquier
// lado sin preguntar.

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];

// Fanfarria de cada casa: mismo largo, distinto carácter.
const FANFARES = {
  // Bronces en Do mayor que suben y se quedan.
  gryffindor(context, out, now) {
    [67, 72, 76].forEach((midi, index) => brass(context, out, { frequency: midiToHz(midi), when: now + index * 0.16, duration: 0.18, gain: 0.1 }));
    [60, 64, 67, 72].forEach((midi) => brass(context, out, { frequency: midiToHz(midi), when: now + 0.5, duration: 1.3, gain: 0.07 }));
    noiseBurst(context, out, { when: now + 0.5, decay: 1.2, gain: 0.12, filter: "highpass", frequency: 5000 });
  },
  // Flauta tibia en Fa mayor, que sube y baja.
  hufflepuff(context, out, now) {
    [65, 69, 72, 77, 72, 74, 77].forEach((midi, index) => {
      tone(context, out, { frequency: midiToHz(midi), type: "triangle", when: now + index * 0.14, attack: 0.04, decay: 0.5, gain: 0.14 });
    });
    [53, 57, 60].forEach((midi) => tone(context, out, { frequency: midiToHz(midi), type: "triangle", when: now + 0.98, attack: 0.1, decay: 1.6, gain: 0.08 }));
  },
  // Celesta rápida en Mi bemol mayor séptima, aérea, con campana al final.
  ravenclaw(context, out, now) {
    [63, 67, 70, 74, 75, 79, 82, 86].forEach((midi, index) => celesta(context, out, { frequency: midiToHz(midi), when: now + index * 0.08, gain: 0.12, pan: index % 2 ? 0.3 : -0.3 }));
    bell(context, out, { frequency: midiToHz(87), when: now + 0.75, gain: 0.12, decay: 3 });
  },
  // Cuerdas graves en Mi menor que se abren, y un siseo.
  slytherin(context, out, now) {
    [40, 47, 52, 55].forEach((midi, index) => brass(context, out, { frequency: midiToHz(midi), when: now + index * 0.22, duration: 1.6 - index * 0.2, gain: 0.08 }));
    noiseBurst(context, out, { when: now + 0.9, attack: 0.3, decay: 1, gain: 0.1, filter: "highpass", frequency: 4500 });
  },
};

const EFFECTS = {
  // Toque de interfaz: madera chiquita.
  tap(context, out, now) {
    tone(context, out, { frequency: 1100, glideTo: 700, decay: 0.05, gain: 0.08, when: now });
  },

  // Hechizo: un soplido que sube y una lluvia de notas brillantes.
  spell(context, out, now, { pitch = 0 } = {}) {
    noiseBurst(context, out, { when: now, attack: 0.08, decay: 0.45, gain: 0.18, frequency: 800, sweepTo: 6000, q: 3 });
    for (let index = 0; index < 7; index += 1) {
      const step = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      celesta(context, out, { frequency: midiToHz(79 + step + pitch), when: now + 0.08 + index * 0.05, gain: 0.07, decay: 0.8, pan: Math.random() - 0.5 });
    }
  },

  // Lumos: un acorde que se enciende de a poco.
  lumos(context, out, now) {
    [72, 76, 79, 84].forEach((midi, index) => {
      tone(context, out, { frequency: midiToHz(midi), when: now + index * 0.05, attack: 0.25, decay: 1.6, gain: 0.06 });
    });
    noiseBurst(context, out, { when: now, attack: 0.2, decay: 0.6, gain: 0.08, frequency: 2000, sweepTo: 8000, q: 2 });
  },

  // Página conseguida: papel que se mueve y un acorde de campanas.
  page(context, out, now) {
    noiseBurst(context, out, { when: now, decay: 0.12, gain: 0.16, frequency: 3000, q: 0.8, pan: -0.2 });
    noiseBurst(context, out, { when: now + 0.11, decay: 0.18, gain: 0.12, frequency: 2200, q: 0.8, pan: 0.2 });
    [74, 78, 81, 86].forEach((midi, index) => bell(context, out, { frequency: midiToHz(midi), when: now + 0.2 + index * 0.09, gain: 0.08, decay: 2.6 }));
  },

  // Error o intento fallido: golpe sordo y una nota que desafina.
  error(context, out, now) {
    tone(context, out, { frequency: 110, glideTo: 70, decay: 0.3, gain: 0.3, when: now });
    tone(context, out, { frequency: 233, type: "sawtooth", decay: 0.35, gain: 0.04, when: now, detune: -30 });
  },

  // Piedra contra piedra: ruido grave que raspa y termina en un golpe.
  stone(context, out, now) {
    noiseBurst(context, out, { when: now, attack: 0.06, decay: 0.55, gain: 0.5, color: "brown", filter: "lowpass", frequency: 500, sweepTo: 180 });
    noiseBurst(context, out, { when: now, attack: 0.04, decay: 0.45, gain: 0.08, frequency: 1300, q: 4, sweepTo: 700 });
    tone(context, out, { frequency: 70, glideTo: 45, decay: 0.3, gain: 0.35, when: now + 0.55 });
  },

  // Soplido corto: algo que pasa rápido cerca.
  whoosh(context, out, now, { pan = 0 } = {}) {
    noiseBurst(context, out, { when: now, attack: 0.08, decay: 0.3, gain: 0.2, frequency: 500, sweepTo: 2400, q: 2, pan });
  },

  // Gota.
  drip(context, out, now) {
    const frequency = 1200 + Math.random() * 800;
    tone(context, out, { frequency, glideTo: frequency * 0.4, decay: 0.15, gain: 0.12, when: now });
  },

  // Siseo de serpiente con tono: el pársel. pitch en semitonos.
  hiss(context, out, now, { pitch = 0, pan = 0 } = {}) {
    const frequency = 2400 * 2 ** (pitch / 12);
    noiseBurst(context, out, { when: now, attack: 0.05, decay: 0.55, gain: 0.3, frequency, q: 9, pan });
    tone(context, out, { frequency: frequency / 8, type: "triangle", when: now, attack: 0.04, decay: 0.5, gain: 0.08, pan });
  },

  // Puerta de piedra enorme que se abre.
  door(context, out, now) {
    noiseBurst(context, out, { when: now, attack: 0.4, decay: 2.6, gain: 0.55, color: "brown", filter: "lowpass", frequency: 300, sweepTo: 120 });
    tone(context, out, { frequency: 49, decay: 3, attack: 0.5, gain: 0.3, when: now });
    [62, 69, 74].forEach((midi, index) => bell(context, out, { frequency: midiToHz(midi), when: now + 1.6 + index * 0.25, gain: 0.07, decay: 3 }));
  },

  // Redoble antes de que el Sombrero hable: golpes que se aceleran.
  drumroll(context, out, now) {
    let time = now;
    let gap = 0.12;
    while (time < now + 1.6) {
      noiseBurst(context, out, { when: time, decay: 0.07, gain: 0.1 + (time - now) * 0.06, color: "brown", filter: "lowpass", frequency: 700 });
      time += gap;
      gap = Math.max(0.035, gap * 0.9);
    }
  },

  fanfare(context, out, now, { house } = {}) {
    (FANFARES[house] ?? FANFARES.ravenclaw)(context, out, now);
  },

  // Snitch atrapada: un clic metálico y un arpegio que sube.
  catch(context, out, now) {
    bell(context, out, { frequency: 2600, when: now, gain: 0.08, decay: 0.5 });
    [74, 78, 81, 86, 90].forEach((midi, index) => celesta(context, out, { frequency: midiToHz(midi), when: now + 0.06 + index * 0.06, gain: 0.1 }));
  },

  // Vela que se apaga: un soplido.
  puff(context, out, now) {
    noiseBurst(context, out, { when: now, attack: 0.02, decay: 0.35, gain: 0.25, filter: "lowpass", frequency: 1800, sweepTo: 300 });
  },

  // Vidrio que se rompe: ráfagas agudas y tintineos.
  glass(context, out, now) {
    noiseBurst(context, out, { when: now, decay: 0.25, gain: 0.3, filter: "highpass", frequency: 3500 });
    for (let index = 0; index < 8; index += 1) {
      tone(context, out, { frequency: 3000 + Math.random() * 4000, when: now + 0.02 + Math.random() * 0.4, decay: 0.12, gain: 0.04, pan: Math.random() - 0.5 });
    }
  },

  // Estante que tiembla: golpes de madera seguidos.
  rattle(context, out, now) {
    for (let index = 0; index < 9; index += 1) {
      tone(context, out, { frequency: 260 + Math.random() * 200, glideTo: 150, when: now + index * 0.06, decay: 0.08, gain: 0.12, pan: Math.random() - 0.5 });
    }
    noiseBurst(context, out, { when: now, attack: 0.05, decay: 0.6, gain: 0.2, color: "brown", filter: "lowpass", frequency: 400 });
  },
};

export function playSfx(name, options) {
  const audio = getAudio();
  const effect = EFFECTS[name];
  if (!audio || !effect) return;
  effect(audio.context, audio.sfx, audio.context.currentTime + 0.01, options);
}
