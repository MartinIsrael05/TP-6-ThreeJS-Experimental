import * as THREE from "three";

// Mensaje pintado en la pared. Se dibuja una vez en un canvas (letras
// torcidas y chorreadas) y se muestra con un shader que solo deja verlo
// donde llega la luz de la varita o donde ya pasó (la máscara).

const TEXT_SIZE = { width: 1024, height: 256 };
const MASK_SIZE = { width: 256, height: 64 };
// Grilla con la que se mide cuánto del mensaje ya se leyó.
const SAMPLE_STEP = 4;

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawText(lines) {
  const canvas = document.createElement("canvas");
  canvas.width = TEXT_SIZE.width;
  canvas.height = TEXT_SIZE.height;
  const context = canvas.getContext("2d");
  const random = seededRandom(5);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#ffffff";
  context.lineCap = "round";
  context.textBaseline = "middle";

  // Un solo tamaño para los dos renglones: el más largo ocupa el 90% del ancho.
  const font = (size) => `italic 700 ${size}px Georgia, "Times New Roman", serif`;
  context.font = font(100);
  const widest = Math.max(...lines.map((line) => context.measureText(line).width));
  const fontSize = Math.min(72, Math.floor((100 * TEXT_SIZE.width * 0.9) / widest));
  context.font = font(fontSize);

  lines.forEach((line, lineIndex) => {
    const width = context.measureText(line).width;
    let x = (TEXT_SIZE.width - width) / 2;
    const baseY = TEXT_SIZE.height * (lineIndex === 0 ? 0.3 : 0.68);
    for (const letter of line) {
      const letterWidth = context.measureText(letter).width;
      context.save();
      context.translate(x + letterWidth / 2, baseY + (random() - 0.5) * 8);
      context.rotate((random() - 0.5) * 0.18);
      context.fillText(letter, -letterWidth / 2, 0);
      context.restore();
      // Chorreadas: algunas letras gotean pintura hacia abajo.
      if (letter.trim() && random() < 0.35) {
        const length = 10 + random() * 34;
        const dripX = x + letterWidth * (0.3 + random() * 0.4);
        context.lineWidth = 2 + random() * 3;
        context.beginPath();
        context.moveTo(dripX, baseY + 14);
        context.lineTo(dripX, baseY + 14 + length);
        context.stroke();
        context.beginPath();
        context.arc(dripX, baseY + 14 + length, context.lineWidth * 0.9, 0, Math.PI * 2);
        context.fill();
      }
      x += letterWidth;
    }
  });
  return canvas;
}

// Lugares del canvas de la máscara que caen sobre pintura: con eso se mide
// el porcentaje leído sin recorrer todos los píxeles.
function inkSamples(textCanvas) {
  const data = textCanvas.getContext("2d").getImageData(0, 0, TEXT_SIZE.width, TEXT_SIZE.height).data;
  const samples = [];
  const scaleX = TEXT_SIZE.width / MASK_SIZE.width;
  const scaleY = TEXT_SIZE.height / MASK_SIZE.height;
  for (let y = 0; y < MASK_SIZE.height; y += 1) {
    for (let x = 0; x < MASK_SIZE.width; x += SAMPLE_STEP / 2) {
      const textIndex = (Math.floor(y * scaleY) * TEXT_SIZE.width + Math.floor(x * scaleX)) * 4 + 3;
      if (data[textIndex] > 128) samples.push((y * MASK_SIZE.width + x) * 4);
    }
  }
  return samples;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uText;
  uniform sampler2D uMask;
  uniform vec2 uLight;      // dónde pega la luz, en coordenadas del cartel (0 a 1)
  uniform float uLightOn;   // 0 apagada, 1 Lumos
  uniform float uSolved;    // 1 cuando se leyó todo
  uniform float uAspect;    // ancho / alto del cartel
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    float ink = texture2D(uText, vUv).a;
    float mask = texture2D(uMask, vUv).r;

    // Círculo de luz con borde suave (corregido por la proporción del cartel).
    vec2 offset = (vUv - uLight) * vec2(uAspect, 1.0);
    float lit = (1.0 - smoothstep(0.12, 0.42, length(offset))) * uLightOn;

    // Lo que ya se leyó queda visible a medias; lo iluminado, del todo.
    float seen = max(max(lit, mask * 0.7), uSolved);
    float pulse = uSolved * (0.55 + 0.25 * sin(uTime * 2.2));
    vec3 dried = vec3(0.32, 0.02, 0.02);
    vec3 wet = vec3(1.7, 0.16, 0.08);
    vec3 color = mix(dried, wet, clamp(lit + pulse, 0.0, 1.0));

    gl_FragColor = vec4(color, ink * seen);
  }
`;

export function createMessage(lines, { width, height }) {
  const textCanvas = drawText(lines);
  const textTexture = new THREE.CanvasTexture(textCanvas);

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = MASK_SIZE.width;
  maskCanvas.height = MASK_SIZE.height;
  const maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
  maskContext.fillStyle = "#000";
  maskContext.fillRect(0, 0, MASK_SIZE.width, MASK_SIZE.height);
  const maskTexture = new THREE.CanvasTexture(maskCanvas);

  const samples = inkSamples(textCanvas);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uText: { value: textTexture },
      uMask: { value: maskTexture },
      uLight: { value: new THREE.Vector2(0.5, 0.5) },
      uLightOn: { value: 0 },
      uSolved: { value: 0 },
      uAspect: { value: width / height },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);

  let dirty = false;

  return {
    mesh,
    uniforms: material.uniforms,
    // Pinta la máscara en un punto del cartel (uv de 0 a 1).
    reveal(uv, radius = 13) {
      const x = uv.x * MASK_SIZE.width;
      const y = (1 - uv.y) * MASK_SIZE.height;
      const gradient = maskContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      maskContext.fillStyle = gradient;
      maskContext.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      dirty = true;
    },
    // Sube la máscara a la GPU como mucho una vez por frame.
    flush() {
      if (!dirty) return;
      maskTexture.needsUpdate = true;
      dirty = false;
    },
    // Fracción del mensaje ya leída (0 a 1).
    coverage() {
      const data = maskContext.getImageData(0, 0, MASK_SIZE.width, MASK_SIZE.height).data;
      let seen = 0;
      for (const index of samples) if (data[index] > 110) seen += 1;
      return samples.length ? seen / samples.length : 1;
    },
  };
}
