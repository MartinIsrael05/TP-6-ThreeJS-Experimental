import Artifact from "@/components/scenes/Artifact";
import Chamber from "@/components/scenes/Chamber";
import Corridor from "@/components/scenes/Corridor";
import GrandStaircase from "@/components/scenes/GrandStaircase";
import GreatHall from "@/components/scenes/GreatHall";
import Ollivanders from "@/components/scenes/Ollivanders";
import Quidditch from "@/components/scenes/Quidditch";
import Trophies from "@/components/scenes/Trophies";

// Escena propia de cada lugar. Los que no figuran usan el artefacto genérico.
const SCENES = {
  "gran-comedor": GreatHall,
  ollivanders: Ollivanders,
  escaleras: GrandStaircase,
  pasillo: Corridor,
  quidditch: Quidditch,
  trofeos: Trophies,
  camara: Chamber,
};

// No necesita "use client": no tiene estado ni efectos, y ya se importa desde
// Experience, que es Client Component. Las escenas sí lo declaran.
export default function ThreeArtifact(props) {
  const Scene = SCENES[props.place.id] ?? Artifact;
  return <Scene {...props} />;
}
