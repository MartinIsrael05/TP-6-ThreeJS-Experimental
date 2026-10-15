import { notFound } from "next/navigation";
import Experience from "@/components/Experience";
import { getPlace, places } from "@/data/places";

export function generateStaticParams() {
  return places.map((place) => ({ lugar: place.id }));
}

export async function generateMetadata({ params }) {
  const { lugar } = await params;
  const place = getPlace(lugar);

  if (!place) return {};

  return {
    title: place.label,
    description: place.copy,
  };
}

export default async function PlacePage({ params }) {
  const { lugar } = await params;

  if (!getPlace(lugar)) notFound();

  return <Experience initialPlaceId={lugar} />;
}
