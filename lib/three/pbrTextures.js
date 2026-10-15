import * as THREE from "three";

// Mapas que bajamos de Poly Haven para cada material, con el nombre que
// usan sus archivos: <nombre>_<sufijo>_1k.jpg.
const MAPS = [
  { suffix: "diff", slot: "map", isColor: true },
  { suffix: "nor_gl", slot: "normalMap", isColor: false },
  { suffix: "rough", slot: "roughnessMap", isColor: false },
];

// Devuelve un MeshStandardMaterial que se ve con su color de respaldo desde
// el primer frame y suma cada textura cuando termina de cargar. Si un archivo
// falta, el material queda con el color y la escena no se rompe.
//
// ctx.isActive() avisa si la escena ya se desmontó: en ese caso la textura que
// llega tarde se libera en lugar de quedar huérfana en la GPU.
export function createPbrMaterial(ctx, { folder, name, repeat = [1, 1], color, tint = "#ffffff", ...params }) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...params });
  const loader = new THREE.TextureLoader();
  const anisotropy = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy());

  for (const { suffix, slot, isColor } of MAPS) {
    const url = `/textures/${folder}/${name}_${suffix}_1k.jpg`;
    loader.load(
      url,
      (texture) => {
        if (!ctx.isActive()) {
          texture.dispose();
          return;
        }
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
        texture.anisotropy = anisotropy;
        if (isColor) {
          texture.colorSpace = THREE.SRGBColorSpace;
          material.color.set(tint);
        }
        material[slot] = texture;
        material.needsUpdate = true;
      },
      undefined,
      () => console.warn(`No se pudo cargar ${url}: queda el color de respaldo.`),
    );
  }

  return material;
}
