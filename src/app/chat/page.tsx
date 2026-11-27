import Image from "next/image";
import ChatPublico from "@/components/ChatPublico";

export const metadata = { title: "María · Guadalquivir Catering", robots: { index: false, follow: false } };

export default function Chat() {
  return (
    <div className="cp-fondo">
      <main className="cp">
        <div className="cp-aviso">Versión de prueba · no es la web definitiva</div>
        <header className="cp-cab">
          <Image src="/logo-icono.png" alt="Guadalquivir Catering" width={44} height={44} style={{ objectFit: "contain" }} />
          <div><strong>María</strong><span>Asistente de IA · siempre disponible</span></div>
        </header>
        <ChatPublico />
      </main>
    </div>
  );
}
