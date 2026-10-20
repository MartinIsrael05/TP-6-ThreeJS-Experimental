import * as THREE from "three";

// Cielo de noche: una esfera vista desde adentro con un degradé del
// horizonte al cenit, el resplandor de la luna, la luna y estrellas.
// Lo usan el campo de Quidditch y la llegada en bote.

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Degradé del horizonte al cenit con un resplandor del lado de la luna.
const fragmentShader = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uMoonDirection;
  varying vec3 vDirection;
  void main() {
    float height = clamp(vDirection.y, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, pow(height, 0.6));
    float moonGlow = pow(max(dot(vDirection, uMoonDirection), 0.0), 24.0);
    color += vec3(0.5, 0.6, 0.8) * moonGlow * 0.6;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createNightSky({ radius = 90, moonDirection, horizon = "#1c2944", zenith = "#04060d", stars = 700 }) {
  const group = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        uHorizon: { value: new THREE.Color(horizon) },
        uZenith: { value: new THREE.Color(zenith) },
        uMoonDirection: { value: moonDirection },
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    }),
  );
  group.add(sky);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(radius / 30, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.5), fog: false }),
  );
  moon.position.copy(moonDirection).multiplyScalar(radius * 0.94);
  moon.lookAt(0, 0, 0);
  group.add(moon);

  // Estrellas en la mitad de arriba del cielo.
  const positions = new Float32Array(stars * 3);
  const starRadius = radius * 0.89;
  for (let index = 0; index < stars; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const y = 0.08 + Math.random() * 0.92;
    const r = Math.sqrt(1 - y * y);
    positions.set([Math.cos(theta) * r * starRadius, y * starRadius, Math.sin(theta) * r * starRadius], index * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: "#dfe6ff", size: radius / 360, fog: false })));

  return group;
}
