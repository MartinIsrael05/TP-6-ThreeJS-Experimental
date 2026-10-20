import * as THREE from "three";

// Página arrancada del diario: papel viejo con renglones de tinta.
export function createDiaryPage() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  const paper = context.createLinearGradient(0, 0, 128, 160);
  paper.addColorStop(0, "#efe4cb");
  paper.addColorStop(1, "#cdb88f");
  context.fillStyle = paper;
  context.fillRect(0, 0, 128, 160);
  context.strokeStyle = "rgba(46, 28, 18, 0.65)";
  context.lineWidth = 2;
  for (let line = 0; line < 9; line += 1) {
    const y = 22 + line * 14;
    context.beginPath();
    context.moveTo(14, y);
    for (let x = 14; x < 114; x += 6) context.lineTo(x, y + Math.sin(x * 0.4 + line) * 1.5);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.9, emissive: "#ffd88a", emissiveIntensity: 0 });
  const page = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), material);
  return { page, material };
}
