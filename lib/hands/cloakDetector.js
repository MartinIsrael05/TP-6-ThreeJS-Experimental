// Capa de invisibilidad con la cámara: detecta si te estás cubriendo. Corre
// todo en el navegador, como el seguimiento de la mano: la imagen no se
// guarda ni se manda a ningún lado.
//
// Hay dos maneras de cubrirse y vale cualquiera:
// - Las dos manos frente a la cara: MediaPipe ve dos manos grandes, juntas y
//   en la mitad de arriba de la imagen.
// - Tapar la cámara con las manos: la imagen se oscurece mucho respecto de
//   cómo se veía antes (con las manos tan cerca, el modelo ya no las ve).

import { createLandmarker } from "@/lib/hands/handTracker";

// Las dos manos cuentan como "frente a la cara" si sus centros están a menos
// de HANDS_GAP (en proporción del ancho), arriba de HANDS_TOP y si entre las
// dos ocupan al menos HANDS_AREA de la imagen.
const HANDS_GAP = 0.42;
const HANDS_TOP = 0.72;
const HANDS_AREA = 0.045;
// Tapada: el brillo cae por debajo de esta fracción del brillo de referencia.
const DARK_RATIO = 0.38;
// Cuadros seguidos para cambiar de estado, así un cuadro suelto no destapa.
const FRAMES_ON = 3;
const FRAMES_OFF = 6;

function bounds(hand) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  hand.forEach(({ x, y }) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, area: (maxX - minX) * (maxY - minY) };
}

function handsOverFace(hands) {
  if (hands.length < 2) return false;
  const [a, b] = hands.map(bounds);
  return Math.abs(a.x - b.x) < HANDS_GAP && (a.y + b.y) / 2 < HANDS_TOP && a.area + b.area > HANDS_AREA;
}

// onFrame recibe { covered, hands, dark } en cada cuadro de la cámara.
export async function startCloakDetection({ onFrame }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  let landmarker;
  try {
    await video.play();
    const vision = await import("@mediapipe/tasks-vision");
    landmarker = await createLandmarker(vision, 2);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  // Brillo medio en una copia chiquita de la imagen.
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  function brightness() {
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let index = 0; index < data.length; index += 4) {
      sum += data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    }
    return sum / (data.length / 4);
  }

  let running = true;
  let frameId = 0;
  let lastVideoTime = -1;
  let reference = 0;
  let covered = false;
  let on = 0;
  let off = 0;

  function loop() {
    if (!running) return;
    frameId = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    const hands = landmarker.detectForVideo(video, performance.now()).landmarks ?? [];
    const light = brightness();
    // La referencia sigue al brillo de la habitación cuando no estás tapado:
    // sube rápido y baja despacio, así una mano encima no la arrastra.
    if (!covered) reference = light > reference ? light : reference * 0.995 + light * 0.005;
    const dark = reference > 12 && light < reference * DARK_RATIO;

    const raw = dark || handsOverFace(hands);
    on = raw ? on + 1 : 0;
    off = raw ? 0 : off + 1;
    if (on >= FRAMES_ON) covered = true;
    if (off >= FRAMES_OFF) covered = false;

    onFrame({ covered, hands: hands.length, dark });
  }
  loop();

  return {
    video,
    stop() {
      running = false;
      cancelAnimationFrame(frameId);
      landmarker.close();
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}
