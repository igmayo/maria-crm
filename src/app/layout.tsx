import type { Metadata, Viewport } from "next";
import "./globals.css";

const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const descripcion = "María, la asistente de IA de Guadalquivir Catering. Resuelve tus dudas y te ayuda a pedir una reunión con el equipo.";

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: "María · Guadalquivir Catering",
  description: descripcion,
  robots: { index: false, follow: false },
  openGraph: { title: "Habla con María · Guadalquivir Catering", description: descripcion, siteName: "Guadalquivir Catering", locale: "es_ES", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
