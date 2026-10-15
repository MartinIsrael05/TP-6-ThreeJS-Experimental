import * as THREE from "three";

// ===================================================================
// Techo encantado del Gran Comedor
// ===================================================================
//
// Recurso desarrollado para el TP: un cielo nocturno hecho enteramente con
// un shader propio, sin texturas. Se dibuja sobre un plano que tapa la sala
// y muestra tres cosas:
//
//   1. Un degradado de cielo, más claro en el centro y oscuro hacia las
//      paredes, como si el techo se disolviera en la penumbra.
//   2. Dos capas de estrellas que titilan, cada una con su tamaño de celda
//      para que haya estrellas cercanas y lejanas.
//   3. Nubes que se desplazan despacio y tapan las estrellas al pasar.
//
// Todo depende de un solo uniform que cambia: uTime. Con
// prefers-reduced-motion el hook deja de avanzar el tiempo y el cielo queda
// quieto, sin perder estrellas ni nubes.
//
// El shader también aplica la niebla de la escena, el tone mapping y el
// espacio de color de Three, así se ve igual con o sin postprocesado.
// ===================================================================

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  // Declara vFogDepth, que la niebla necesita en el fragment shader.
  #include <fog_pars_vertex>

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Guarda la distancia a la cámara (usa mvPosition).
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uSize;        // tamaño del plano en metros (ancho, largo)
  uniform vec3 uZenith;      // color del cielo en el centro
  uniform vec3 uHorizon;     // color del cielo contra las paredes
  uniform vec3 uCloudColor;  // nubes iluminadas por una luna que no se ve
  uniform vec3 uStarColor;

  varying vec2 vUv;

  #include <fog_pars_fragment>

  // ---------------------------------------------------------------
  // Azar reproducible: el mismo punto siempre da el mismo número entre
  // 0 y 1. Así cada celda de estrellas es estable de un frame al otro.
  // ---------------------------------------------------------------
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Ruido de valor: interpola suave entre los valores al azar de las cuatro
  // esquinas de cada celda. Da manchas continuas en lugar de puntos sueltos.
  float valueNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // curva suave entre esquinas

    float a = hash(cell);
    float b = hash(cell + vec2(1.0, 0.0));
    float c = hash(cell + vec2(0.0, 1.0));
    float d = hash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // fbm (fractional Brownian motion): suma varias octavas de ruido, cada una
  // con el doble de detalle y la mitad de peso. Es lo que da a las nubes
  // bordes deshilachados en lugar de manchas lisas.
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 5; octave++) {
      value += amplitude * valueNoise(p);
      p = p * 2.03 + vec2(17.0, 9.0); // el desplazamiento evita patrones repetidos
      amplitude *= 0.5;
    }
    return value;
  }

  // ---------------------------------------------------------------
  // Una capa de estrellas. El techo se divide en celdas de cellSize metros;
  // cada celda tiene o no una estrella (según density), ubicada en un punto
  // al azar dentro de la celda, con tamaño, brillo y ritmo de titileo propios.
  // ---------------------------------------------------------------
  float starLayer(vec2 p, float cellSize, float density, float time) {
    vec2 cell = floor(p / cellSize);
    vec2 local = fract(p / cellSize) - 0.5; // posición dentro de la celda, de -0.5 a 0.5

    float seed = hash(cell);
    float present = step(1.0 - density, seed); // 1 si la celda tiene estrella

    vec2 offset = (vec2(hash(cell + 17.0), hash(cell + 43.0)) - 0.5) * 0.7;
    float radius = mix(0.03, 0.1, hash(cell + 7.0));
    float glow = 1.0 - smoothstep(0.0, radius, length(local - offset));

    // Titileo: cada estrella oscila con su propia velocidad y fase.
    float speed = mix(1.2, 3.8, hash(cell + 3.0));
    float twinkle = 0.55 + 0.45 * sin(time * speed + seed * 6.2831);

    return present * glow * glow * twinkle;
  }

  void main() {
    vec2 p = vUv * uSize; // coordenadas en metros: las celdas no se estiran

    // 1. Cielo: más claro en el centro del ancho, más oscuro contra las paredes.
    float acrossWidth = abs(vUv.x - 0.5) * 2.0;
    vec3 sky = mix(uZenith, uHorizon, smoothstep(0.1, 1.0, acrossWidth));

    // 2. Nubes: fbm que se desplaza con el tiempo, en dos capas a distinta
    //    velocidad para que tengan profundidad.
    vec2 drift = vec2(uTime * 0.035, uTime * 0.012);
    float cloudsFar = fbm(p * 0.11 + drift);
    float cloudsNear = fbm(p * 0.07 - drift * 1.6 + 31.0);
    float clouds = smoothstep(0.42, 0.78, cloudsFar) * 0.6 + smoothstep(0.48, 0.8, cloudsNear) * 0.7;
    clouds = clamp(clouds, 0.0, 1.0);

    // 3. Estrellas: una capa fina y lejana y otra de estrellas más grandes.
    float stars = starLayer(p, 0.45, 0.35, uTime) * 0.9
                + starLayer(p + 3.7, 1.3, 0.25, uTime * 0.8) * 1.8;
    stars *= 1.0 - clouds * 0.95; // las nubes las tapan

    vec3 color = mix(sky, uCloudColor * (0.55 + 0.45 * cloudsNear), clouds);
    color += uStarColor * stars; // pueden pasar de 1: el bloom las hace brillar

    // El techo se disuelve en la oscuridad cerca de las paredes y los extremos.
    float toSides = smoothstep(0.0, 0.2, min(vUv.x, 1.0 - vUv.x));
    float toEnds = smoothstep(0.0, 0.06, min(vUv.y, 1.0 - vUv.y));
    color *= toSides * toEnds;

    gl_FragColor = vec4(color, 1.0);

    // Mismos pasos finales que los materiales de Three.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function createEnchantedCeiling({ width, length, height, centerZ }) {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uSize: { value: new THREE.Vector2(width, length) },
        uZenith: { value: new THREE.Color("#25386e") },
        uHorizon: { value: new THREE.Color("#080a16") },
        uCloudColor: { value: new THREE.Color("#66739a") },
        uStarColor: { value: new THREE.Color("#fff3d6") },
      },
    ]),
  });

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  ceiling.rotation.x = Math.PI / 2; // mira hacia abajo
  ceiling.position.set(0, height, centerZ);

  return {
    mesh: ceiling,
    update(elapsed) {
      material.uniforms.uTime.value = elapsed;
    },
  };
}
