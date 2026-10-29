import { notFound } from "next/navigation";
import DiaryReader from "@/components/DiaryReader";
import { diaryEntries, getDiaryEntry } from "@/data/diary";

export function generateStaticParams() {
  return diaryEntries.map((entry) => ({ pagina: entry.number }));
}

export async function generateMetadata({ params }) {
  const { pagina } = await params;
  const entry = getDiaryEntry(pagina);

  if (!entry) return {};

  return {
    title: `Diario, página ${entry.number}`,
    description: `Una de las páginas arrancadas del diario de Tom Riddle: «${entry.title}»`,
  };
}

// Server Component: valida la página y arma los datos. Si ya la conseguiste
// lo decide DiaryReader en el navegador, que es donde vive el progreso.
export default async function DiaryPage({ params }) {
  const { pagina } = await params;
  const entry = getDiaryEntry(pagina);

  if (!entry) notFound();

  return <DiaryReader entry={entry} />;
}
