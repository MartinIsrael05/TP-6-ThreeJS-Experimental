import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Corrección de color cálida y viñeta en una sola pasada: cada pass es un
// dibujo de pantalla completa, así que juntarlas ahorra uno.
// Trabaja en espacio lineal, antes de que OutputPass aplique el tone mapping.
const WarmGradeShader = {
  name: "WarmGradeShader",
  uniforms: {
    tDiffuse: { value: null },
    uWarmth: { value: new THREE.Vector3(1.08, 1, 0.86) },
    uContrast: { value: 1.06 },
    uVignette: { value: 0.6 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uWarmth;    // multiplica cada canal: más rojo, menos azul
    uniform float uContrast; // exponente > 1 hunde un poco las sombras
    uniform float uVignette; // cuánto se oscurecen los bordes

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      color.rgb = pow(color.rgb * uWarmth, vec3(uContrast));

      // Viñeta: distancia al centro (un poco más ancha que alta) y una
      // caída suave entre 0.35 y 0.85.
      float distanceToCenter = length((vUv - 0.5) * vec2(1.0, 1.15));
      color.rgb *= 1.0 - smoothstep(0.35, 0.85, distanceToCenter) * uVignette;

      gl_FragColor = color;
    }
  `,
};

// Cadena de postprocesado: escena -> bloom -> corrección cálida y viñeta ->
// OutputPass (tone mapping del renderer y conversión a sRGB).
// El render target usa HalfFloat para conservar los colores que pasan de 1
// (las llamas) y MSAA para no perder el antialiasing del canvas.
export function createComposer({ renderer, scene, camera, bloom = {}, grade = {} }) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(Math.max(size.x, 1), Math.max(size.y, 1), {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, target);

  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(size.x / 2, size.y / 2),
      bloom.strength ?? 0.6,
      bloom.radius ?? 0.5,
      bloom.threshold ?? 0.9,
    ),
  );

  const gradePass = new ShaderPass(WarmGradeShader);
  if (grade.warmth) gradePass.uniforms.uWarmth.value.set(...grade.warmth);
  if (grade.contrast) gradePass.uniforms.uContrast.value = grade.contrast;
  if (grade.vignette !== undefined) gradePass.uniforms.uVignette.value = grade.vignette;
  composer.addPass(gradePass);

  composer.addPass(new OutputPass());
  return composer;
}
