import { redirect } from "next/navigation";
import NavEnlace from "@/components/NavEnlace";
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
        <NavEnlace seccion="bandeja">{icono(<><path d="M3 13l2-8h14l2 8v6H3z" /><path d="M3 13h5l1 2h6l1-2h5" /></>)}Bandeja</NavEnlace>
        <span className="nv off" aria-disabled="true">{icono(<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>)}Pendientes</span>
        {perfil.rol === "administrador" && <NavEnlace seccion="usuarios">{icono(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><path d="M17 5v6M14 8h6" /></>)}Usuarios</NavEnlace>}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span title={perfil.email} className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{perfil.nombre.slice(0, 2).toUpperCase()}</span>
          <form action={salir}><button className="enlace-boton" type="submit" style={{ fontSize: 11 }}>Salir</button></form>
        </div>
      </nav>
      {children}
    </div>
  );
}
