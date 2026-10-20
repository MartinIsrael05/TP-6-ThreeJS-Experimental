// Detector de siseo por micrófono, para hablar pársel. Una "s" sostenida
// tiene casi toda su energía entre 3,5 y 9 kHz; la voz y el ruido de la
// habitación, más abajo. Se compara esa banda con el ruido de fondo (que se
// va midiendo solo) y con la banda de la voz.
//
// El audio del micrófono se analiza en el navegador y no se guarda ni se
// manda a ningún lado.

const HISS_BAND = [3500, 9000];
const VOICE_BAND = [150, 1500];
// Cuántas veces por encima del ruido de fondo tiene que estar la banda del
// siseo (unos 9 dB).
const MIN_SNR = 8;

function bandEnergy(bins, binHz, [from, to]) {
  let sum = 0;
  const last = Math.min(bins.length - 1, Math.ceil(to / binHz));
  for (let index = Math.floor(from / binHz); index <= last; index += 1) sum += 10 ** (bins[index] / 10);
  return sum;
}

// context es el AudioContext del sitio. Devuelve read(), que da
// { level (0 a 1), hissing }, y stop().
export async function startHissDetection(context) {
  // Sin supresión de ruido: el navegador borraría justamente el siseo.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
  });
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.25;
  source.connect(analyser); // no va a los parlantes: solo se mide
  const bins = new Float32Array(analyser.frequencyBinCount);
  const binHz = context.sampleRate / analyser.fftSize;
  let floor = null;

  return {
    read() {
      analyser.getFloatFrequencyData(bins);
      const hiss = bandEnergy(bins, binHz, HISS_BAND);
      const voice = bandEnergy(bins, binHz, VOICE_BAND);
      // El piso de ruido baja enseguida y sube muy despacio: así un siseo
      // largo no se vuelve "ruido de fondo".
      if (floor === null || hiss < floor) floor = hiss;
      else floor += (hiss - floor) * 0.002;
      const snr = hiss / Math.max(floor, 1e-12);
      return {
        level: Math.min(1, Math.max(0, Math.log10(snr) / 2)),
        hissing: snr > MIN_SNR && hiss > voice * 0.5,
      };
    },
    stop() {
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}
