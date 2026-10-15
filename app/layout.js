import { siteName } from "@/data/places";
import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
