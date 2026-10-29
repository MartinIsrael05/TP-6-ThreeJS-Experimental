// Seguimiento de la mano con MediaPipe Hand Landmarker. Todo corre en el
// navegador: la imagen de la cámara no se guarda ni se manda a ningún lado.
//
// La WASM de MediaPipe (12 MB) se baja de jsDelivr con la misma versión fija
// que el paquete; el modelo de la mano está en public/models. Las dos cosas
// se cargan recién cuando alguien activa la cámara.

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "/models/hand_landmarker.task";

// Puntos del modelo que se usan (hay 21 por mano).
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_BASE = 9;

// Pellizco con histéresis: se cierra por debajo de PINCH_ON y se abre por
// encima de PINCH_OFF, así no titila en el borde. Son proporciones del
// tamaño de la mano, no píxeles.
const PINCH_ON = 0.32;
const PINCH_OFF = 0.48;

// La mano no llega a los bordes de la imagen: este margen se estira para
// cubrir toda la pantalla.
const REACH = 0.14;

// También lo usa la capa de invisibilidad, que necesita ver las dos manos.
export async function createLandmarker(vision, numHands = 1) {
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO",
    numHands,
  });
  try {
    return await vision.HandLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    // Sin WebGL2 en el delegado de GPU: más lento, pero anda.
    return vision.HandLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Arranca la cámara y el modelo. onFrame recibe, cuando hay mano,
// { x, y, pinched } con x e y de 0 a 1 en la pantalla (ya espejado: mover la
// mano a la derecha mueve el cursor a la derecha); sin mano recibe null.
export async function startHandTracking({ onFrame }) {
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
    landmarker = await createLandmarker(vision);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  let running = true;
  let frameId = 0;
  let lastVideoTime = -1;
  let pinched = false;
  const smooth = { x: 0.5, y: 0.5, ready: false };

  function loop() {
    if (!running) return;
    frameId = requestAnimationFrame(loop);
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;

    const result = landmarker.detectForVideo(video, performance.now());
    const hand = result.landmarks?.[0];
    if (!hand) {
      smooth.ready = false;
      pinched = false;
      onFrame(null);
      return;
    }

    // Cursor: entre la punta del pulgar y la del índice, que es donde se
    // juntan al pellizcar (así el cursor no salta al cerrar los dedos).
    const thumb = hand[THUMB_TIP];
    const index = hand[INDEX_TIP];
    const rawX = 1 - (thumb.x + index.x) / 2; // espejo
    const rawY = (thumb.y + index.y) / 2;
    const x = clamp01((rawX - REACH) / (1 - REACH * 2));
    const y = clamp01((rawY - REACH) / (1 - REACH * 2));

    // Suavizado: más fuerte con movimientos chicos (temblor), más suelto con
    // movimientos grandes (gestos).
    if (!smooth.ready) {
      smooth.x = x;
      smooth.y = y;
      smooth.ready = true;
    } else {
      const jump = Math.hypot(x - smooth.x, y - smooth.y);
      const follow = Math.min(1, 0.25 + jump * 6);
      smooth.x += (x - smooth.x) * follow;
      smooth.y += (y - smooth.y) * follow;
    }

    const size = distance(hand[WRIST], hand[MIDDLE_BASE]) || 1;
    const gap = distance(thumb, index) / size;
    if (!pinched && gap < PINCH_ON) pinched = true;
    else if (pinched && gap > PINCH_OFF) pinched = false;

    onFrame({ x: smooth.x, y: smooth.y, pinched });
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
