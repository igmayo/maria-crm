import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { cargarConversacion, nombreTitulares } from "@/lib/datos";
import { fechaLarga } from "@/lib/formato";
import { TIPOS_EVENTO, ESTADOS_EVENTO, ORIGENES, ETIQUETA_ESTADO } from "@/lib/ficha";
import { editarFicha } from "@/app/equipo/(panel)/acciones";

const errores: Record<string, string> = {
  titular1: "El titular 1 necesita un nombre.", fecha: "La fecha no es válida.", hora: "Las horas deben tener formato 18:00.",
  numero: "Adultos y niños deben ser números (0 o más).", opcion: "Revisa los desplegables.", correo: "Algún correo no parece válido.",
  guardar: "No se ha podido guardar. Inténtalo de nuevo.", permiso: "Solo la responsable de la boda y los administradores pueden editar la ficha.",
};
const tiposTxt: Record<string, string> = { boda: "Boda", empresa: "Evento de empresa", otro: "Otro" };

export default async function EditarFicha({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const conv = await cargarConversacion(id);
  if (!conv) redirect("/equipo");
  if (!conv.puedeEditarFicha) redirect(`/equipo/c/${id}`);
  const ev = conv.evento;
  const [t1, t2] = [1, 2].map((n) => ev.contactos.find((c) => c.posicion === n));
  const origenes = ev.origen && !(ORIGENES as readonly string[]).includes(ev.origen) ? [...ORIGENES, ev.origen] : [...ORIGENES];
  return (
    <main className="modal" style={{ flex: 1 }}>
      <form action={editarFicha} className="modal-caja" aria-label="Editar ficha de la boda">
        <input type="hidden" name="conversacion" value={id} />
        <div><h1>Editar ficha</h1><p className="intro">{nombreTitulares(ev.contactos)}{ev.fecha ? ` · ${fechaLarga(ev.fecha).toLowerCase()}` : ""}</p></div>
        {error && errores[error] && <p className="error" role="alert">{errores[error]}</p>}
        <p className="aviso-fila" style={{ background: "#FFF9EE", border: "1px solid #F3E2BC" }}>Aquí cambias los datos directamente. Los cambios que piden los novios llegan aparte, como solicitud, y los validas tú.</p>

        <div className="sec">Boda <span className="bd g">Lo ven los novios</span></div>
        <div className="fila">
          <label className="campo"><span>Fecha</span><input className="fi" name="fecha" type="date" defaultValue={ev.fecha ?? ""} /></label>
          <label className="campo" style={{ flex: 2 }}><span>Espacio</span><input className="fi" name="lugar" maxLength={120} defaultValue={ev.lugar ?? ""} /></label>
        </div>
        <div className="fila">
          <label className="campo"><span>Tipo de ceremonia</span>
            <select className="fi" name="tipo_ceremonia" defaultValue={ev.tipo_ceremonia ?? ""}><option value="">Sin indicar</option><option value="religiosa">Religiosa</option><option value="civil">Civil</option></select></label>
          <label className="campo"><span>Hora de la ceremonia</span><input className="fi" name="hora_ceremonia" type="time" defaultValue={ev.hora_ceremonia?.slice(0, 5) ?? ""} /></label>
          <label className="campo"><span>Hora del banquete</span><input className="fi" name="hora_banquete" type="time" defaultValue={ev.hora_banquete?.slice(0, 5) ?? ""} /></label>
        </div>

        <div className="sec">Invitados <span className="bd g">Lo ven los novios</span></div>
        <div className="fila">
          <label className="campo"><span>Adultos</span><input className="fi" name="adultos" type="number" min={0} max={9999} defaultValue={ev.adultos ?? ""} /></label>
          <label className="campo"><span>Niños</span><input className="fi" name="ninos" type="number" min={0} max={9999} defaultValue={ev.ninos ?? ""} /></label>
        </div>

        <div className="sec">Menú <span className="bd g">Lo ven los novios</span></div>
        <label className="campo"><span>Qué se sirve</span><textarea className="fi" name="menu" maxLength={1000} defaultValue={ev.menu ?? ""} /></label>

        <div className="sec">Titulares <span className="bd g">Su correo recibe el enlace personal</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[{ n: 1, t: t1, c: "#0F6B62" }, { n: 2, t: t2, c: "#A14A1F" }].map(({ n, t, c }) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <strong style={{ fontSize: 13, color: c }}>Titular {n}</strong>
              <div className="fila">
                <label className="campo"><span>Nombre</span><input className="fi" name={`nombre${n}`} maxLength={80} required={n === 1} defaultValue={t?.nombre ?? ""} /></label>
                <label className="campo"><span>Teléfono</span><input className="fi" name={`telefono${n}`} type="tel" maxLength={40} defaultValue={t?.telefono ?? ""} /></label>
                <label className="campo"><span>Correo</span><input className="fi" name={`correo${n}`} type="email" maxLength={200} defaultValue={t?.email ?? ""} /></label>
              </div>
            </div>
          ))}
          <p className="nota">El titular 2 solo se guarda si tiene nombre. Nada se borra al dejarlo en blanco.</p>
        </div>

        <div className="sec">Solo para el equipo <span className="bd gr">Los novios no lo ven</span></div>
        <div className="fila">
          <label className="campo"><span>Tipo de evento</span><select className="fi" name="tipo" defaultValue={ev.tipo}>{TIPOS_EVENTO.map((x) => <option key={x} value={x}>{tiposTxt[x]}</option>)}</select></label>
          <label className="campo"><span>Estado</span><select className="fi" name="estado" defaultValue={ev.estado}>{ESTADOS_EVENTO.map((x) => <option key={x} value={x}>{ETIQUETA_ESTADO[x]}</option>)}</select></label>
          <label className="campo"><span>Origen</span><select className="fi" name="origen" defaultValue={ev.origen ?? "Otro"}>{origenes.map((x) => <option key={x}>{x}</option>)}</select></label>
        </div>
        <label className="campo"><span>Algún dato de interés</span><textarea className="fi" name="dato_interes" maxLength={2000} placeholder="Algo que convenga saber de esta boda" defaultValue={ev.dato_interes ?? ""} /></label>
        <p className="nota">Las alergias y dietas no van aquí: tienen su propio apartado protegido.</p>

        <div className="acciones-form">
          <Link href={`/equipo/c/${id}`} className="btn-sec">Cancelar</Link>
          <button className="btn-pri" type="submit">Guardar cambios</button>
        </div>
      </form>
    </main>
  );
}
