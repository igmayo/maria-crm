import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { perfilActivo } from "@/lib/sesion";
import { salir } from "../login/acciones";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const icono = (d: React.ReactNode) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
  );
  return (
    <div className="app">
      <nav aria-label="Principal" className="nav">
        <Image src="/logo-icono.png" alt="Guadalquivir Catering" width={40} height={40} style={{ objectFit: "contain" }} />
        <span className="nv off" aria-disabled="true">{icono(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" /></>)}Hoy</span>
        <Link href="/equipo" className="nv on" aria-current="page">{icono(<><path d="M3 13l2-8h14l2 8v6H3z" /><path d="M3 13h5l1 2h6l1-2h5" /></>)}Bandeja</Link>
        <span className="nv off" aria-disabled="true">{icono(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>)}Pendientes</span>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span title={perfil.email} className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{perfil.nombre.slice(0, 2).toUpperCase()}</span>
          <form action={salir}><button className="enlace-boton" type="submit" style={{ fontSize: 11 }}>Salir</button></form>
        </div>
      </nav>
      {children}
    </div>
  );
}
