import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { cargarConversacion, nombreTitulares } from "@/lib/datos";
import { hayClaveDeServicio } from "@/lib/supabase/admin";
import { estadoEnlaces } from "@/lib/acceso-servidor";
import { caducaEn } from "@/lib/acceso";
import { fechaLarga, etiquetaFecha } from "@/lib/formato";
import AccesoTitular from "@/components/AccesoTitular";

const colorTitular = ["#0F6B62", "#A14A1F"];

export default async function DarAcceso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const conv = await cargarConversacion(id);
  if (!conv) redirect("/equipo");
  if (!conv.puedeEditarFicha) redirect(`/equipo/c/${id}`);
  const titulares = [...conv.evento.contactos].sort((a, b) => a.posicion - b.posicion);
  const estados = hayClaveDeServicio() ? await estadoEnlaces(titulares.map((t) => t.id!).filter(Boolean)) : {};
  const fecha = conv.evento.fecha;
  const limite = fecha ? fechaLarga(caducaEn(fecha).toISOString().slice(0, 10)).replace(/^\S+\s/, "") : null;
  return (
    <main className="modal" style={{ flex: 1 }}>
      <section className="modal-caja" aria-label="Dar acceso a los novios">
        <div>
          <h1>Dar acceso a {nombreTitulares(titulares)}</h1>
          <p className="intro">Cada uno recibe su enlace personal para entrar a su boda. No necesitan usuario ni contraseña.</p>
        </div>
        {!fecha && <p className="error" role="alert">Falta la fecha de la boda. <Link href={`/equipo/c/${id}/ficha`}>Ponla en la ficha</Link> para poder crear enlaces: se cierran 30 días después de la boda.</p>}
        {!hayClaveDeServicio() && <p className="error" role="alert">Falta la clave de servicio de Supabase en el servidor: no se pueden gestionar enlaces.</p>}
        {titulares.map((t) => {
          const e = estados[t.id ?? ""];
          return (
            <div key={t.posicion} className="titular" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontWeight: 600, color: colorTitular[t.posicion - 1], fontSize: 15 }}>{t.nombre} <span style={{ fontWeight: 400, fontSize: 12, color: "var(--suave)" }}>· Titular {t.posicion}</span></strong>
                <span className={e?.activo ? "bd g" : "bd gr"}>{e?.activo ? "Acceso activo" : "Sin enlace todavía"}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--suave)" }}>
                {t.email ? <>Se envía a <strong style={{ color: "var(--texto)", fontWeight: 600 }}>{t.email}</strong>, el correo de la ficha. </> : "No hay correo en la ficha: solo puedes copiar el enlace. "}
                <Link href={`/equipo/c/${id}/ficha`} style={{ color: "#6B4200", fontWeight: 600 }}>Cambiar en la ficha</Link>
              </div>
              {e && (e.enviadoEn || e.ultimoUso) && (
                <div style={{ fontSize: 13 }}>{[e.enviadoEn && `Enviado por correo ${etiquetaFecha(e.enviadoEn)}`, e.ultimoUso && `último acceso ${etiquetaFecha(e.ultimoUso)}`].filter(Boolean).join(" · ")}</div>
              )}
              {fecha && t.id && <AccesoTitular conversacion={id} contacto={t.id} tieneCorreo={Boolean(t.email)} />}
            </div>
          );
        })}
        <p className="nota">Con “Copiar enlace” puedes mandárselo tú por WhatsApp. Cada vez que copias o envías se crea un enlace nuevo y los anteriores siguen funcionando; solo “Anular” los cierra.</p>
        {limite && <p className="nota">El acceso se cierra solo 30 días después de la boda (el {limite}). Si un enlace se ha compartido por error, anúlalo y crea uno nuevo: el anterior deja de funcionar al momento.</p>}
        <div><Link href={`/equipo/c/${id}`} className="btn-sec">Cerrar</Link></div>
      </section>
    </main>
  );
}
