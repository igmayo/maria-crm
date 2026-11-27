import Link from "next/link";
import { redirect } from "next/navigation";
import { listarBandeja, cargarConversacion, listarComerciales, type Filtro, type Conversacion } from "@/lib/datos";
import { perfilActivo } from "@/lib/sesion";
import { encabezadoDia, etiquetaFecha, fechaLarga, horaMensaje, iniciales } from "@/lib/formato";
import { enviarMensaje, cerrarConversacion, reabrirConversacion, asignarConversacion } from "@/app/equipo/(panel)/acciones";
import Redactor from "@/components/Redactor";
import TextoMaria from "@/components/TextoMaria";

const estados: Record<string, [string, string]> = {
  maria: ["María atiende", "g"], te_toca: ["Te toca", "a"], humano: ["En curso", "bl"], cerrada: ["Cerrada", "gr"], sin_asignar: ["Sin asignar", "p"],
};
const roles: Record<string, string> = { administrador: "Administrador", comercial: "Comercial", diseno: "Diseño", almacen: "Almacén", administracion: "Administración" };
const tipos: Record<string, string> = { boda: "Boda", empresa: "Evento de empresa", otro: "Evento" };
const colorTitular = ["#0F6B62", "#A14A1F"];

function href(filtro: Filtro, q: string, id?: string) {
  const p = new URLSearchParams();
  if (filtro !== "todas") p.set("f", filtro);
  if (q) p.set("q", q);
  const s = p.toString();
  return (id ? `/equipo/c/${id}` : "/equipo") + (s ? `?${s}` : "");
}

export default async function VistaBandeja({ filtro, q, seleccionada, error }: { filtro: Filtro; q: string; seleccionada?: string; error?: string }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const esAdmin = perfil.rol === "administrador";
  const [{ items, fallo }, conv, comerciales] = await Promise.all([
    listarBandeja(filtro, q, perfil.id),
    seleccionada ? cargarConversacion(seleccionada) : Promise.resolve(null),
    esAdmin && seleccionada ? listarComerciales() : Promise.resolve([]),
  ]);
  const filtros: [Filtro, string][] = [["todas", "Todas"], ["te_toca", "Te toca"], ["mias", "Mis parejas"], ...(esAdmin ? ([["sin_asignar", "Sin asignar"]] as [Filtro, string][]) : [])];
  const puedeCrear = esAdmin || perfil.rol === "comercial";
  return (
    <>
      <section aria-label="Conversaciones" className="lista">
        <div className="lista-cab">
          <h1>Bandeja {puedeCrear && <Link href="/equipo/nuevo" className="btn-pri" style={{ height: 34, fontSize: 12 }}>+ Nuevo contacto</Link>}</h1>
          <form method="get" action="/equipo">
            {filtro !== "todas" && <input type="hidden" name="f" value={filtro} />}
            <label className="buscar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></svg>
              <input name="q" defaultValue={q} aria-label="Buscar pareja" placeholder="Buscar pareja" />
            </label>
          </form>
          <div className="filtros">
            {filtros.map(([f, t]) => <Link key={f} href={href(f, q)} className={f === filtro ? "filtro on" : "filtro"}>{t}</Link>)}
          </div>
        </div>
        {fallo ? (
          <div className="vacio"><strong>No se han podido cargar las conversaciones</strong>Recarga la página. Si sigue igual, avisa a Iván.</div>
        ) : items.length === 0 ? (
          <div className="vacio"><strong>{q || filtro !== "todas" ? "Nada con ese filtro" : "Todavía no hay conversaciones"}</strong>
            {q || filtro !== "todas" ? "Prueba con otra búsqueda o quita el filtro." : puedeCrear ? "Crea un contacto nuevo para empezar." : "Aquí verás las conversaciones que te compartan."}</div>
        ) : items.map((i) => {
          const [t, c] = estados[i.estado] ?? [i.estado, "gr"];
          return (
            <Link key={i.id} href={href(filtro, q, i.id)} className={i.id === seleccionada ? "item sel" : "item"}>
              <div className={i.estado === "sin_asignar" ? "av p" : i.estado === "cerrada" ? "av gr" : "av"}>{iniciales(i.titulares)}</div>
              <div className="item-cuerpo">
                <div className="item-fila"><strong style={{ fontWeight: 600 }}>{i.titulares}</strong><span>{etiquetaFecha(i.ultimaActividad)}</span></div>
                <div className="item-texto">{i.ultimoTexto}</div>
                <div className="item-pie"><span className={`bd ${c}`}>{t}</span>{i.responsable && <span>{i.esMia ? "Tú" : `La lleva ${i.responsable}`}</span>}</div>
              </div>
            </Link>
          );
        })}
      </section>
      {conv ? <Detalle conv={conv} error={error} comerciales={esAdmin ? comerciales : null} /> : (
        <div className="centro-vacio">{seleccionada ? "No encuentro esa conversación o no tienes acceso." : "Elige una conversación de la lista."}</div>
      )}
    </>
  );
}

function Detalle({ conv, error, comerciales }: { conv: Conversacion; error?: string; comerciales: { id: string; nombre: string }[] | null }) {
  const ev = conv.evento;
  const titulares = [...ev.contactos].sort((a, b) => a.posicion - b.posicion);
  const nombre = titulares.map((t) => t.nombre).join(" y ") || "Sin nombre";
  const [et, ec] = estados[conv.estado] ?? [conv.estado, "gr"];
  const tel = titulares.find((t) => t.telefono)?.telefono?.replace(/[^\d+]/g, "");
  const mail = titulares.find((t) => t.email)?.email;
  const sub = [tipos[ev.tipo] ?? "Evento", ev.fecha ? fechaLarga(ev.fecha) : null, ev.lugar, conv.responsable ? `La lleva ${conv.responsable}` : "Sin responsable"].filter(Boolean).join(" · ");
  let diaActual = "";
  return (
    <>
      <section aria-label={`Conversación con ${nombre}`} className="conv">
        <header className="conv-cab">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2>{nombre}</h2><span className={`bd ${ec}`}>{et}</span></div>
            <div className="sub">{sub}</div>
          </div>
          {comerciales && (
            <form action={asignarConversacion} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="hidden" name="conversacion" value={conv.id} />
              <select className="fi" name="comercial" aria-label="Comercial responsable" defaultValue={conv.responsable_id ?? ""} style={{ height: 40, width: "auto" }}>
                {!conv.responsable_id && <option value="" disabled>Elegir comercial…</option>}
                {comerciales.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button className="btn-sec" type="submit">{conv.responsable_id ? "Reasignar" : "Asignar"}</button>
            </form>
          )}
          {conv.puedeEscribir && conv.estado !== "cerrada" && (
            <form action={cerrarConversacion}><input type="hidden" name="conversacion" value={conv.id} /><button className="btn-sec" type="submit">Cerrar</button></form>
          )}
          {conv.puedeEscribir && conv.estado === "cerrada" && (
            <form action={reabrirConversacion}><input type="hidden" name="conversacion" value={conv.id} /><button className="btn-sec" type="submit">Reabrir</button></form>
          )}
          {(tel || mail) && (
            <div className="contactar">
              <small>Contactar por otra vía</small>
              {tel && <a className="ct" href={`https://wa.me/${tel.replace(/^\+/, "")}`} target="_blank" rel="noreferrer" style={{ background: "#E4F3E6", borderColor: "#BFDEC4", color: "#1E5B2B" }}>WhatsApp</a>}
              {tel && <a className="ct" href={`tel:${tel}`}>Llamar</a>}
              {mail && <a className="ct" href={`mailto:${mail}`}>Correo</a>}
            </div>
          )}
        </header>
        <div className="hilo">
          {error === "asignar" && <p className="error" role="alert">No se ha podido asignar la conversación. Comprueba que el comercial siga activo.</p>}
          {error === "envio" && <p className="error" role="alert">No se ha podido enviar el mensaje. Inténtalo de nuevo.</p>}
          {conv.mensajes.length === 0 && <div className="dia">Aún no hay mensajes en esta conversación.</div>}
          {conv.mensajes.map((m) => {
            const d = encabezadoDia(m.creado_en);
            const cab = d !== diaActual ? <div className="dia">{(diaActual = d)}</div> : null;
            let cuerpo: React.ReactNode;
            if (m.autor === "titular") {
              const t = titulares.find((x) => x.id === m.contacto_id);
              cuerpo = <div className="burbuja b-titular">{t && <div className="quien" style={{ color: colorTitular[(m.posicion ?? 1) - 1] }}>{t.nombre}</div>}{m.texto}<small>{horaMensaje(m.creado_en)}</small></div>;
            } else if (m.autor === "maria") {
              cuerpo = <div className="burbuja b-maria"><div className="quien" style={{ color: "#6B4200" }}>María</div><TextoMaria texto={m.texto ?? ""} /><small>{horaMensaje(m.creado_en)}</small></div>;
            } else if (m.autor === "nota_interna") {
              cuerpo = <div className="burbuja b-nota"><div className="quien">Nota interna · solo el equipo</div><strong style={{ fontWeight: 600 }}>{m.nombreEquipo}</strong>: {m.texto}<small>{horaMensaje(m.creado_en)}</small></div>;
            } else if (m.autor === "equipo") {
              cuerpo = <div className="burbuja b-equipo"><div className="quien">{m.nombreEquipo ?? "Equipo"}</div>{m.texto}<small>{horaMensaje(m.creado_en)}</small></div>;
            } else cuerpo = <div className="chip">{m.texto}</div>;
            return <div key={m.id} style={{ display: "contents" }}>{cab}{cuerpo}</div>;
          })}
        </div>
        {conv.puedeEscribir ? <Redactor conversacion={conv.id} destinatarios={nombre} accion={enviarMensaje} /> : <div className="solo-lectura">Solo lectura: esta conversación la lleva {conv.responsable ?? "otra persona"}.</div>}
      </section>
      <aside aria-label="Ficha" className="ficha">
        <div>
          <h2>Ficha</h2>
          <dl>
            <dt>Tipo</dt><dd>{tipos[ev.tipo] ?? ev.tipo}</dd>
            <dt>Fecha</dt><dd>{fechaLarga(ev.fecha)}</dd>
            <dt>Lugar</dt><dd>{ev.lugar ?? "Sin indicar"}</dd>
            <dt>Invitados</dt><dd>{ev.invitados ?? "Sin indicar"}</dd>
            <dt>Origen</dt><dd>{ev.origen ?? "Sin indicar"}</dd>
            <dt>Comercial</dt><dd>{conv.responsable ?? "Sin asignar"}</dd>
            <dt>Estado</dt><dd style={{ textTransform: "capitalize" }}>{ev.estado}</dd>
          </dl>
        </div>
        {conv.miembros.length > 0 && (
          <div>
            <h2>Compartida con</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {conv.miembros.map((m) => (
                <div key={m.nombre} className="eq-fila"><span className="av" style={{ width: 36, height: 36, fontSize: 12 }}>{m.nombre[0]}</span>
                  <div style={{ flex: 1 }}><strong style={{ fontWeight: 600 }}>{m.nombre}</strong><div style={{ fontSize: 12, color: "var(--suave)" }}>{m.permiso === "escribir" ? "Puede escribir" : "Solo lectura"}</div></div>
                  <span className="bd bl">{roles[m.rol] ?? m.rol}</span></div>
              ))}
            </div>
          </div>
        )}
        <div>
          <h2>Titulares</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {titulares.map((t) => (
              <div key={t.posicion} className="titular">
                <div style={{ display: "flex", justifyContent: "space-between", margin: 0 }}><strong style={{ fontWeight: 600, color: colorTitular[t.posicion - 1] }}>{t.nombre}</strong><span style={{ fontSize: 11, color: "var(--suave)" }}>Titular {t.posicion}</span></div>
                <div>{[t.telefono, t.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
