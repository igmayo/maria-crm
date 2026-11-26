import type { ReactNode } from "react";

export const metadata = {
  title: "María · Guadalquivir Catering",
  description: "Asistente de IA y CRM de conversaciones (versión de prueba)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Montserrat, system-ui, sans-serif", background: "#FFF9EE", color: "#282828" }}>
        {children}
      </body>
    </html>
  );
}
