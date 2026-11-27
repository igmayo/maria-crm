import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { listarComerciales } from "@/lib/datos";
import { crearContacto } from "../acciones";

const mensajes: Record<string, string> = { nombre: "Escribe al menos el nombre del titular 1.", guardar: "No se ha podido guardar el contacto. Inténtalo de nuevo." };

export default async function Nuevo({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador" && perfil.rol !== "comercial") redirect("/equipo");
  const { error } = await searchParams;
  const esAdmin = perfil.rol === "administrador";
  const comerciales = esAdmin ? await listarComerciales() : [];
  return (
    <main className="modal" style={{ flex: 1 }}>
      <form action={crearContacto} className="modal-caja">
        <div><h1>Nuevo contacto</h1><p className="intro">Para un lead que llega por correo, teléfono, feria u otro canal.</p></div>
        {error && mensajes[error] && <p className="error" role="alert">{mensajes[error]}</p>}
        <div className="sec">Titular 1</div>
        <div className="fila">
          <label className="campo"><span>Nombre</span><input className="fi" name="nombre1" required /></label>
          <label className="campo"><span>Teléfono</span><input className="fi" name="telefono1" type="tel" /></label>
        </div>
        <label className="campo"><span>Correo</span><input className="fi" name="correo1" type="email" /></label>
        <div className="sec">Titular 2 <em>(opcional)</em></div>
        <div className="fila">
          <label className="campo"><span>Nombre</span><input className="fi" name="nombre2" /></label>
          <label className="campo"><span>Correo</span><input className="fi" name="correo2" type="email" /></label>
        </div>
        <div className="fila">
          <label className="campo"><span>Tipo de evento</span><select className="fi" name="tipo"><option value="boda">Boda</option><option value="empresa">Evento de empresa</option><option value="otro">Otro</option></select></label>
          <label className="campo"><span>Fecha</span><input className="fi" name="fecha" type="date" /></label>
          <label className="campo"><span>Invitados</span><input className="fi" name="invitados" type="number" min="0" /></label>
        </div>
        <div className="fila">
          <label className="campo" style={{ flex: 2 }}><span>Lugar</span><input className="fi" name="lugar" /></label>
          <label className="campo"><span>Origen</span><select className="fi" name="origen"><option>Correo</option><option>Teléfono</option><option>Feria</option><option>Otro</option></select></label>
        </div>
        <label><span className="campo" style={{ display: "block" }}><span>Correo original (opcional, pégalo aquí)</span></span><textarea className="fi" name="original" /></label>
        {esAdmin ? (
          <label className="campo"><span>Asignar a</span>
            <select className="fi" name="asignar" defaultValue="sin">
              {comerciales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              <option value="sin">Sin asignar (lo reparte el administrador)</option>
            </select></label>
        ) : <p className="intro">Se asignará a ti.</p>}
        <div className="acciones-form"><Link href="/equipo" className="btn-sec" style={{ height: 48, padding: "0 22px", fontSize: 14 }}>Cancelar</Link><button className="btn-pri" type="submit" style={{ height: 48, padding: "0 26px", fontSize: 14 }}>Crear contacto</button></div>
      </form>
    </main>
  );
}
