import { Cinzel, EB_Garamond } from "next/font/google";
import { siteName } from "@/data/places";
import "./globals.css";

// Cinzel para títulos (capitales de inscripción) y EB Garamond para el texto
// narrativo. Las dos son OFL y next/font las sirve desde el mismo dominio.
const cinzel = Cinzel({
  subsets: ["latin", "latin-ext"],
  variable: "--font-titulo",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-texto",
  display: "swap",
});

export const metadata = {
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description:
    "Experiencia web transmedia ambientada en Hogwarts: seguí las páginas arrancadas del diario de Tom Riddle por el castillo hasta la Cámara de los Secretos. TP6 de Programación Multimedial III, UMAI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${cinzel.variable} ${garamond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
