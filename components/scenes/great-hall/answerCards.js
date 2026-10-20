import * as THREE from "three";

// Respuestas del Sombrero como pergaminos que flotan en el comedor. Se
// eligen señalándolas un rato (DWELL_SECONDS) o tocándolas. La elegida vuela
// al Sombrero y las demás se desvanecen.

const CARD = { width: 2.3, height: 1.25 };
const TEXTURE = { width: 512, height: 278 };
const DWELL_SECONDS = 1.4;
const FLY_SECONDS = 0.7;

// Escribe el texto en el pergamino, partido en renglones que entren.
function drawCard(context, text) {
  const { width, height } = TEXTURE;
  context.clearRect(0, 0, width, height);
  const paper = context.createLinearGradient(0, 0, width, height);
  paper.addColorStop(0, "#efe4cb");
  paper.addColorStop(1, "#cdb88f");
  context.fillStyle = paper;
  context.beginPath();
  context.moveTo(10, 18);
  for (let x = 10; x <= width - 10; x += 32) context.lineTo(x, 12 + Math.sin(x * 0.7) * 6); // borde de arriba arrancado
  context.lineTo(width - 10, height - 12);
  context.lineTo(10, height - 12);
  context.closePath();
  context.fill();

  context.fillStyle = "#2e1c12";
  context.font = `italic 34px Georgia, "Times New Roman", serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width > width - 70 && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  lines.push(line);
  const lineHeight = 42;
  const top = height / 2 - ((lines.length - 1) * lineHeight) / 2 + 4;
  lines.forEach((entry, index) => context.fillText(entry, width / 2, top + index * lineHeight));
}

export function createAnswerCards({ hatPosition }) {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(CARD.width, CARD.height);
  const barGeometry = new THREE.PlaneGeometry(CARD.width * 0.8, 0.06);
  barGeometry.translate(CARD.width * 0.4, 0, 0); // crece desde la izquierda

  const cards = [0, 1, 2, 3].map((index) => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE.width;
    canvas.height = TEXTURE.height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.card = index;
    const bar = new THREE.Mesh(barGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.6), transparent: true, opacity: 0 }));
    bar.position.set(-CARD.width * 0.4, -CARD.height / 2 - 0.12, 0.01);
    bar.scale.x = 0.001;
    mesh.add(bar);
    group.add(mesh);
    return {
      mesh,
      material,
      bar,
      texture,
      context: canvas.getContext("2d"),
      home: new THREE.Vector3(),
      base: 1,
      phase: index * 1.3,
      answerId: null,
      dwell: 0,
      glow: 0,
      fly: -1,
    };
  });

  let visible = false;
  let flying = null;

  // En pantallas anchas van en fila; en angostas, en una grilla de 2 x 2 y
  // más chicas, para que entren las cuatro.
  function layout(aspect) {
    cards.forEach((card, index) => {
      if (aspect >= 1.15) {
        card.base = 1;
        card.home.set((index - 1.5) * 2.55, 2.5 + (index % 2) * 0.35, -15.5 - Math.abs(index - 1.5) * 0.6);
      } else {
        card.base = 0.6;
        card.home.set((index % 2 === 0 ? -1 : 1) * 0.76, 3.15 - Math.floor(index / 2) * 0.95, -15.7);
      }
    });
  }
  layout(1.6);

  return {
    group,
    meshes: cards.map((card) => card.mesh),
    isBusy: () => flying !== null,
    layout,
    // Muestra las respuestas de una pregunta (o ninguna con null).
    setQuestion(question) {
      visible = Boolean(question);
      cards.forEach((card, index) => {
        const answer = question?.answers[index];
        card.answerId = answer?.id ?? null;
        card.dwell = 0;
        card.fly = -1;
        card.mesh.scale.setScalar(card.base);
        card.mesh.position.copy(card.home).add(new THREE.Vector3(0, -0.8, 0));
        if (answer) {
          drawCard(card.context, answer.text);
          card.texture.needsUpdate = true;
        }
      });
    },
    // Elige una tarjeta: vuela al Sombrero. Devuelve el id de la respuesta.
    pick(index) {
      const card = cards[index];
      if (!visible || flying || !card?.answerId) return null;
      flying = card;
      card.fly = 0;
      card.from = card.mesh.position.clone();
      return card.answerId;
    },
    // hovered: índice bajo el puntero o -1. Devuelve el índice que completó
    // la espera (para elegirlo) o -1.
    update({ elapsed, delta, hovered }) {
      let ready = -1;
      cards.forEach((card, index) => {
        const target = visible && card.answerId ? 1 : 0;
        if (card === flying) {
          card.fly += delta / FLY_SECONDS;
          const t = Math.min(card.fly, 1);
          card.mesh.position.lerpVectors(card.from, hatPosition, t * t);
          card.mesh.scale.setScalar(card.base * (1 - t * 0.9));
          card.material.opacity = 1 - t * 0.6;
          if (card.fly >= 1) {
            flying = null;
            visible = false;
            card.material.opacity = 0;
          }
          return;
        }
        // Las otras se apagan mientras una vuela.
        const fade = flying ? 0 : target;
        card.material.opacity = THREE.MathUtils.damp(card.material.opacity, fade, 5, delta || 1);
        card.mesh.position.x = card.home.x;
        card.mesh.position.z = card.home.z;
        card.mesh.position.y = THREE.MathUtils.damp(card.mesh.position.y, card.home.y + Math.sin(elapsed * 1.2 + card.phase) * 0.08, 4, delta || 1);
        card.mesh.rotation.z = Math.sin(elapsed * 0.8 + card.phase) * 0.03;

        const over = index === hovered && fade > 0.5;
        card.dwell = over ? card.dwell + delta : Math.max(0, card.dwell - delta * 2);
        card.glow = THREE.MathUtils.damp(card.glow, over ? 1 : 0, 8, delta || 1);
        card.mesh.scale.setScalar(card.base * (1 + card.glow * 0.08));
        card.material.color.setScalar(1 + card.glow * 0.35);
        card.bar.scale.x = Math.max(0.001, card.dwell / DWELL_SECONDS);
        card.bar.material.opacity = card.dwell > 0 ? 1 : 0;
        if (card.dwell >= DWELL_SECONDS && ready < 0) ready = index;
      });
      return ready;
    },
  };
}
