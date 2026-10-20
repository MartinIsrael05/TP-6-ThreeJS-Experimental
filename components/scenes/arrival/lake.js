import * as THREE from "three";
import { createDotTexture } from "@/lib/three/sprites";

// El Lago Negro: un plano con un shader que inventa olas con senos, refleja
// el cielo según el ángulo (Fresnel), deja un camino de brillos bajo la luna
// y unos reflejos tibios donde están las ventanas del castillo.

const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uMoonDirection;
  uniform vec3 uCastleDirection;
  uniform vec3 uDeep;
  uniform vec3 uSky;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uWindows;   // cuánto están encendidas las ventanas (0 a 1)

  varying vec3 vWorld;

  void main() {
    vec2 p = vWorld.xz;
    float t = uTime;

    // Pendiente de la superficie: suma de olas en distintas direcciones.
    vec2 slope = vec2(0.0);
    slope += vec2(0.8, 0.3) * cos(dot(p, vec2(0.8, 0.3)) * 0.9 + t * 1.1);
    slope += vec2(-0.4, 0.9) * cos(dot(p, vec2(-0.4, 0.9)) * 1.7 + t * 1.5) * 0.6;
    slope += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 3.1 + t * 2.3) * 0.35;
    slope += vec2(1.0, 0.1) * cos(dot(p, vec2(1.0, 0.1)) * 6.3 + t * 3.1) * 0.2;
    vec3 normal = normalize(vec3(-slope.x * 0.07, 1.0, -slope.y * 0.07));

    vec3 toCamera = normalize(cameraPosition - vWorld);
    vec3 reflected = reflect(-toCamera, normal);
    float fresnel = pow(1.0 - max(dot(toCamera, normal), 0.0), 4.0);
    vec3 color = mix(uDeep, uSky, fresnel);

    // Camino de la luna: brillo muy concentrado en la dirección reflejada.
    float moon = pow(max(dot(reflected, uMoonDirection), 0.0), 380.0);
    color += vec3(1.6, 1.7, 1.9) * moon * 1.4;
    float moonHaze = pow(max(dot(reflected, uMoonDirection), 0.0), 24.0);
    color += vec3(0.08, 0.1, 0.16) * moonHaze;

    // Reflejo de las ventanas: estirado en vertical y cortado por las olas.
    float windows = pow(max(dot(reflected, uCastleDirection), 0.0), 40.0);
    float broken = 0.5 + 0.5 * sin(p.x * 2.7 + slope.y * 4.0 + t);
    color += vec3(1.3, 0.7, 0.22) * windows * broken * 0.7 * uWindows;

    // Niebla a mano (el ShaderMaterial no la trae).
    float distanceToCamera = length(cameraPosition - vWorld);
    float fog = 1.0 - exp(-pow(distanceToCamera * uFogDensity, 2.0));
    gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
  }
`;

export function createLake({ moonDirection, castleDirection, fog }) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoonDirection: { value: moonDirection },
      uCastleDirection: { value: castleDirection },
      uDeep: { value: new THREE.Color("#03060c") },
      uSky: { value: new THREE.Color("#22324f") },
      uFogColor: { value: fog.color },
      uFogDensity: { value: fog.density },
      uWindows: { value: 0 },
    },
    vertexShader,
    fragmentShader,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), material);
  mesh.rotation.x = -Math.PI / 2;
  return { mesh, uniforms: material.uniforms };
}

// Bote: la mitad de abajo de una esfera estirada, con un farol en un palo.
const LANTERN_COLOR = new THREE.Color(2.6, 1.6, 0.6);

export function createBoat({ glowTexture, withLight = false }) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#6b4a2e", roughness: 0.8, side: THREE.DoubleSide });
  // El casco asoma del agua: la mitad de abajo de una esfera, con borde y
  // un banco para que se lea como bote y no como un farol flotando.
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), wood);
  hull.scale.set(0.55, 0.42, 1.3);
  hull.position.y = 0.3;
  group.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 32), wood);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(0.55, 1.3, 1);
  rim.position.y = 0.3;
  group.add(rim);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.25), wood);
  bench.position.y = 0.2;
  group.add(bench);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), wood);
  pole.position.set(0, 0.75, 0.95);
  group.add(pole);
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: LANTERN_COLOR }));
  lantern.position.set(0, 1.22, 1.0);
  group.add(lantern);
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color: new THREE.Color(1.4, 0.8, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glow.scale.setScalar(1.1);
  glow.position.copy(lantern.position);
  group.add(glow);
  if (withLight) {
    const light = new THREE.PointLight("#ffb36b", 2.2, 9, 2);
    light.position.copy(lantern.position).add(new THREE.Vector3(0, 0.3, 0));
    group.add(light);
  }
  return { group, lantern: lantern.position };
}

// Niebla baja sobre el agua: manchas grandes y suaves que se corren despacio.
export function createMist({ count = 140, area }) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = THREE.MathUtils.randFloat(area.min.x, area.max.x);
    positions[index * 3 + 1] = THREE.MathUtils.randFloat(0.3, 2.2);
    positions[index * 3 + 2] = THREE.MathUtils.randFloat(area.min.z, area.max.z);
    seeds[index] = Math.random() * 10;
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", attribute);
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ map: createDotTexture(), color: "#4a5a78", size: 9, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  const width = area.max.x - area.min.x;
  return {
    points,
    update(time, delta) {
      if (delta === 0) return;
      for (let index = 0; index < count; index += 1) {
        const i = index * 3;
        positions[i] += (0.25 + Math.sin(seeds[index] + time * 0.1) * 0.1) * delta;
        if (positions[i] > area.max.x) positions[i] -= width;
      }
      attribute.needsUpdate = true;
    },
  };
}
