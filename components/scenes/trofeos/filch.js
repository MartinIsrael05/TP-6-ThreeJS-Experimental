import * as THREE from "three";

// Filch con su linterna y Señora Norris. Los dos están armados mirando a +z
// (hacia la cámara); la escena los gira.

export const BEAM_LENGTH = 26;

// Haz de la linterna: un cono abierto con un shader propio. Es más brillante
// cerca de la linterna y en el centro, se apaga en los bordes (según cuánto
// mira cada cara a la cámara) y tiene polvo que se mueve a lo largo.
const BeamShader = {
  vertexShader: /* glsl */ `
    uniform float uLength;
    varying float vAlong;
    varying vec3 vNormalView;
    varying vec3 vViewDir;

    void main() {
      vAlong = position.z / uLength;
      vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
      vNormalView = normalize(normalMatrix * normal);
      vViewDir = normalize(-viewPosition.xyz);
      gl_Position = projectionMatrix * viewPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uIntensity;
    uniform float uTime;
    varying float vAlong;
    varying vec3 vNormalView;
    varying vec3 vViewDir;

    void main() {
      float facing = abs(dot(normalize(vNormalView), normalize(vViewDir)));
      float soft = pow(facing, 1.6);
      float along = clamp(vAlong, 0.0, 1.0);
      float fade = pow(1.0 - along, 1.8) * smoothstep(0.0, 0.04, along);
      float dust = 0.8 + 0.2 * sin(along * 46.0 - uTime * 1.7) * sin(along * 13.0 + uTime * 0.6);
      gl_FragColor = vec4(uColor * soft * fade * dust * uIntensity, 1.0);
    }
  `,
};

function createBeam() {
  // El cono de Three.js apunta a +y con la punta arriba: se acuesta para que
  // la punta quede en la linterna y se abra hacia +z.
  const geometry = new THREE.ConeGeometry(Math.tan(0.36) * BEAM_LENGTH, BEAM_LENGTH, 32, 1, true);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, BEAM_LENGTH / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#ffcf7a") },
      uIntensity: { value: 0 },
      uTime: { value: 0 },
      uLength: { value: BEAM_LENGTH },
    },
    vertexShader: BeamShader.vertexShader,
    fragmentShader: BeamShader.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

export function buildFilch() {
  const group = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: "#2b2620", roughness: 0.95 });
  const skin = new THREE.MeshStandardMaterial({ color: "#a08a74", roughness: 0.8 });

  // Saco largo torneado, un poco encorvado hacia adelante.
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(
      [[0, 0], [0.42, 0], [0.38, 0.5], [0.3, 1.1], [0.27, 1.38], [0.14, 1.5], [0, 1.52]].map(([x, y]) => new THREE.Vector2(x, y)),
      18,
    ),
    coat,
  );
  body.rotation.x = 0.12;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), skin);
  head.position.set(0, 1.66, 0.2);
  group.add(head);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.62, 8), coat);
  arm.position.set(0.3, 1.18, 0.3);
  arm.rotation.x = 0.9;
  group.add(arm);

  // Linterna: un farol con la llama encendida, una luz que alumbra alrededor
  // y un foco que es lo que "ve".
  const lantern = new THREE.Group();
  lantern.position.set(0.32, 1.02, 0.55);
  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.24, 6, 1, true),
    new THREE.MeshStandardMaterial({ color: "#3a2f22", metalness: 0.7, roughness: 0.45, wireframe: true }),
  );
  lantern.add(cage);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1) }));
  lantern.add(flame);
  const glow = new THREE.PointLight("#ffb860", 6, 6, 1.6);
  lantern.add(glow);
  const spot = new THREE.SpotLight("#ffd28a", 0, 30, 0.36, 0.55, 1.1);
  spot.target.position.set(0, -0.6, 10);
  lantern.add(spot, spot.target);
  const beam = createBeam();
  beam.rotation.x = 0.02;
  lantern.add(beam);
  group.add(lantern);

  return { group, lantern, spot, beam, flame };
}

export function buildNorris() {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: "#26221e", roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), fur);
  body.scale.set(0.16, 0.15, 0.32);
  body.position.y = 0.24;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), fur);
  head.position.set(0, 0.42, 0.3);
  group.add(head);
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 6), fur);
    ear.position.set(side * 0.06, 0.53, 0.29);
    group.add(ear);
  });
  const tail = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, -0.28), new THREE.Vector3(0, 0.55, -0.42), new THREE.Vector3(0.08, 0.72, -0.36)]), 12, 0.022, 6),
    fur,
  );
  group.add(tail);

  // Ojos que brillan con bloom: se encienden cuando mira.
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.26, 0.05) });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), eyeMaterial);
    eye.position.set(side * 0.045, 0.44, 0.4);
    group.add(eye);
  });

  return { group, eyeMaterial, tail };
}
