// Liberación de recursos de Three.js. La GPU no se entera de que React
// desmontó un componente: todo lo que tiene dispose() se libera a mano.

// Libera el material y todas sus texturas, también las que van en uniforms
// de un ShaderMaterial.
export function disposeMaterial(material) {
  for (const value of Object.values(material)) {
    if (value?.isTexture) value.dispose();
  }
  if (material.uniforms) {
    for (const uniform of Object.values(material.uniforms)) {
      if (uniform.value?.isTexture) uniform.value.dispose();
    }
  }
  material.dispose();
}

// Recorre el árbol y libera geometrías, materiales e instancias. Si un recurso
// está compartido se libera más de una vez, y eso no tiene efecto extra.
export function disposeObject(root) {
  root.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(disposeMaterial);
    }
    // InstancedMesh guarda sus matrices (y colores) en buffers propios.
    if (object.isInstancedMesh) object.dispose();
  });
}

// EffectComposer.dispose() libera sus render targets, pero no los passes.
// Además, algún pass no libera todos sus materiales: en three 0.186,
// UnrealBloomPass.dispose() se olvida de materialHighPassFilter y deja un
// programa de shader por cada montaje. Por eso se libera todo material que
// quede como propiedad del pass.
export function disposeComposer(composer) {
  composer.passes.forEach((pass) => {
    pass.dispose();
    for (const value of Object.values(pass)) {
      if (value?.isMaterial) value.dispose();
    }
  });
  composer.dispose();
}
