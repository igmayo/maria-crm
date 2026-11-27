import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "María · Guadalquivir Catering", robots: { index: false, follow: false } };

export default function Inicio() {
  return (
    <div className="centro" style={{ background: "var(--calido)" }}>
      <main className="tarjeta" style={{ maxWidth: 420, gap: 32 }}>
        <div className="cabecera">
          <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={190} height={64} priority style={{ objectFit: "contain", height: "auto" }} />
          <div>
            <h1>Hola, soy María</h1>
            <p>La asistente de IA de Guadalquivir Catering. Te ayudo a resolver dudas sobre nuestros servicios y a pedir una reunión con el equipo.</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/chat" className="btn-pri" style={{ height: 52, borderRadius: 26, fontSize: 15, justifyContent: "center" }}>
            Hablar con María
          </Link>
          <Link href="/equipo/login" className="btn-sec" style={{ height: 48, borderRadius: 24, fontSize: 14, justifyContent: "center" }}>
            Acceso del equipo
          </Link>
        </div>

        <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: "var(--suave)" }}>
          ¿Ya tenéis fecha con nosotros? Entrad con el enlace personal que os envió vuestra comercial.
        </p>
      </main>
    </div>
  );
}
