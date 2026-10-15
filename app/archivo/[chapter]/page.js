import { notFound } from "next/navigation";
import Experience from "@/components/Experience";
import { getPlace, places } from "@/data/places";

export function generateStaticParams() {
  return places.map((place) => ({ chapter: place.id }));
}

export async function generateMetadata({ params }) {
  const { chapter: placeId } = await params;
  const place = getPlace(placeId);

  if (!place) return {};

  return {
    title: `${place.label} — SEÑAL 88`,
    description: place.copy,
  };
}

export default async function ChapterPage({ params }) {
  const { chapter: placeId } = await params;

  if (!getPlace(placeId)) notFound();

  return <Experience initialPlaceId={placeId} />;
}
