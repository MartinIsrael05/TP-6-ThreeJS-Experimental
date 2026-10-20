import { AMBIENCES } from "@/lib/audio/ambiences";

// Motor de audio del sitio. Todo se sintetiza con Web Audio API: no hay
// archivos de sonido, así que no hay licencias que revisar ni megas que bajar.
//
// Los navegadores no dejan sonar nada antes del primer gesto (click, toque o
// tecla), por eso el AudioContext se crea recién en unlockAudio(). Hasta
// entonces los efectos se ignoran y el ambiente pedido queda anotado para
// arrancar apenas se pueda.
//
// Cadena: efectos, ambiente y música -> master -> compresor -> parlantes.
// Cada bus manda además una parte a una reverb compartida (la piedra del
// castillo).

const STORAGE_KEY = "hogwarts-sonido";
const LEVELS = { master: 0.9, sfx: 0.85, ambience: 0.6, spatial: 0.8 };
const REVERB_SEND = { sfx: 0.3, ambience: 0.25, spatial: 0.15 };

let audio = null;
let muted = null;
const mutedListeners = new Set();

let wantedAmbience = null;
let currentAmbience = null;

function readMuted() {
  if (muted === null) {
    try {
      muted = window.localStorage.getItem(STORAGE_KEY) === "off";
    } catch {
      muted = false;
    }
  }
  return muted;
}

// Respuesta al impulso de una sala de piedra: ruido estéreo que se apaga.
function impulseResponse(context, seconds, decay) {
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
    }
  }
  return buffer;
}

function build() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const context = new AudioContextClass();

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 4;
  compressor.connect(context.destination);

  const master = context.createGain();
  master.gain.value = readMuted() ? 0 : LEVELS.master;
  master.connect(compressor);

  const reverb = context.createConvolver();
  reverb.buffer = impulseResponse(context, 3.2, 2.6);
  reverb.connect(master);

  function bus(name) {
    const gain = context.createGain();
    gain.gain.value = LEVELS[name];
    gain.connect(master);
    const send = context.createGain();
    send.gain.value = REVERB_SEND[name];
    gain.connect(send).connect(reverb);
    return gain;
  }

  return { context, master, sfx: bus("sfx"), ambience: bus("ambience"), spatial: bus("spatial") };
}

// Fundido cruzado: el ambiente anterior baja en un segundo y medio mientras
// el nuevo sube.
function switchAmbience() {
  if (!audio || currentAmbience?.id === wantedAmbience) return;
  const { context } = audio;

  if (currentAmbience) {
    const previous = currentAmbience;
    previous.output.gain.setTargetAtTime(0, context.currentTime, 0.4);
    window.setTimeout(() => {
      previous.stop();
      previous.output.disconnect();
    }, 2500);
    currentAmbience = null;
  }

  const builder = AMBIENCES[wantedAmbience];
  if (!builder) return;
  const output = context.createGain();
  output.gain.value = 0;
  output.gain.setTargetAtTime(1, context.currentTime, 0.6);
  output.connect(audio.ambience);
  currentAmbience = { id: wantedAmbience, output, stop: builder(context, output) };
}

// Crea o reanuda el contexto. Tiene que llamarse dentro de un gesto.
export function unlockAudio() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = build();
    if (!audio) return null;
    switchAmbience();
  }
  if (audio.context.state !== "running" && document.visibilityState === "visible") {
    audio.context.resume().catch(() => {});
  }
  return audio;
}

// Escucha gestos en toda la página para desbloquear (y reanudar, en iOS el
// contexto se suspende solo). Pausa el audio con la pestaña oculta.
export function installAudioUnlock() {
  const gestures = ["pointerdown", "keydown", "touchend"];
  const onGesture = () => unlockAudio();
  const onVisibility = () => {
    if (!audio) return;
    if (document.visibilityState === "hidden") audio.context.suspend().catch(() => {});
    else audio.context.resume().catch(() => {});
  };
  gestures.forEach((type) => window.addEventListener(type, onGesture, true));
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    gestures.forEach((type) => window.removeEventListener(type, onGesture, true));
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

// El audio listo para usar, o null si todavía no hubo gesto o está en silencio.
export function getAudio() {
  if (!audio || readMuted()) return null;
  return audio;
}

export function setAmbience(id) {
  wantedAmbience = id;
  switchAmbience();
}

// Silencio: se guarda en el navegador porque es una preferencia de esta
// persona en este equipo, no parte del progreso.
export function isMuted() {
  return typeof window === "undefined" ? false : readMuted();
}

export function setMuted(value) {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "off" : "on");
  } catch {
    // Sin localStorage (modo privado estricto) el silencio dura la visita.
  }
  if (audio) {
    audio.master.gain.setTargetAtTime(value ? 0 : LEVELS.master, audio.context.currentTime, 0.08);
  }
  mutedListeners.forEach((listener) => listener());
}

export function subscribeMuted(listener) {
  mutedListeners.add(listener);
  return () => mutedListeners.delete(listener);
}
