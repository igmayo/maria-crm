import { redirect } from "next/navigation";
import Image from "next/image";
import { perfilActivo } from "@/lib/sesion";
import { salir } from "./login/acciones";

const roles: Record<string, string> = {
  administrador: "Administrador", comercial: "Comercial", diseno: "Diseño", almacen: "Almacén", administracion: "Administración",
};

export default async function Equipo() {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  return (
    <>
      <header className="panel-barra">
        <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={150} height={50} style={{ height: "auto" }} />
        <div className="panel-usuario">
          <span><strong style={{ color: "var(--texto)" }}>{perfil.nombre}</strong> · {roles[perfil.rol] ?? perfil.rol}</span>
          <form action={salir}><button className="enlace-boton" type="submit">Salir</button></form>
        </div>
      </header>
      <main className="panel-contenido">
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Hola, {perfil.nombre}</h1>
        <p style={{ color: "var(--suave)" }}>Aquí estará tu bandeja. De momento, el panel está vacío.</p>
      </main>
    </>
  );
}
