import Artifact from "@/components/scenes/Artifact";
import GreatHall from "@/components/scenes/GreatHall";

// Escena propia de cada lugar. Los que no figuran usan el artefacto genérico.
const SCENES = {
  "gran-comedor": GreatHall,
};

// No necesita "use client": no tiene estado ni efectos, y ya se importa desde
// Experience, que es Client Component. Las escenas sí lo declaran.
export default function ThreeArtifact(props) {
  const Scene = SCENES[props.place.id] ?? Artifact;
  return <Scene {...props} />;
}
