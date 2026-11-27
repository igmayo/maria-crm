import Image from "next/image";
import type { Metadata } from "next";
import { cargarPortal } from "@/lib/acceso-servidor";
import { fechaLarga } from "@/lib/formato";
import { ETIQUETA_CAMPO, ESTADO_NOVIOS, esCampo, mostrarValor } from "@/lib/cambios";
import AltoVisible from "@/components/AltoVisible";
import PestanasBoda from "@/components/PestanasBoda";
import { ETIQUETA_CEREMONIA, textoInvitados } from "@/lib/ficha";

// El enlace es personal: que no se indexe y que no viaje en la cabecera Referer a otras webs.
export const metadata: Metadata = { title: "Mi boda · Guadalquivir Catering", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const hora = (t: string | null) => (t ? t.slice(0, 5) : null);

export default async function PortalBoda({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await cargarPortal(token);
  if (!p) {
    return (
      <main className="centro"><div className="tarjeta">
        <div className="cabecera">
          <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={240} height={80} priority style={{ height: "auto" }} />
          <div><h1>Enlace no válido</h1><p>Ha caducado o se ha anulado.</p></div>
        </div>
        <p className="pie">Pide a tu comercial que te envíe uno nuevo.</p>
      </div></main>
    );
  }
  const nombres = p.titulares.map((t) => t.nombre).join(" y ");
  const e = p.evento;
  const ceremonia = [e.tipo_ceremonia && ETIQUETA_CEREMONIA[e.tipo_ceremonia], hora(e.hora_ceremonia)].filter(Boolean).join(" · ");
  const filas: [string, string | null][] = [
    ["Espacio", e.lugar],
    ["Ceremonia", ceremonia || null],
    ["Banquete", hora(e.hora_banquete)],
    ["Invitados", textoInvitados(e) === "Sin indicar" ? null : textoInvitados(e)],
    ["Menú", e.menu],
  ];
  const miBoda = (
    <div style={{ padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      <section aria-label="Los datos de vuestra boda" style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>Los datos de vuestra boda</h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px 1fr", gap: "10px 12px", fontSize: 14 }}>
          {filas.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--suave)" }}>{k}</dt><dd style={{ margin: 0 }}>{v ?? <span style={{ color: "var(--suave)" }}>Aún por confirmar</span>}</dd></div>
          ))}
        </dl>
      </section>
      {p.cambios.length > 0 && (
        <section aria-label="Cambios que habéis pedido" style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cambios que habéis pedido</h2>
          {p.cambios.map((c, i) => {
            const campo = esCampo(c.campo) ? c.campo : "otro";
            const cls = c.estado === "aprobada" ? "g" : c.estado === "rechazada" ? "gr" : "a";
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", fontSize: 14 }}>
                <span>{campo === "otro" ? c.valorPedido : `${ETIQUETA_CAMPO[campo]} → ${mostrarValor(campo, c.valorPedido)}`}</span>
                <span className={`bd ${cls}`}>{ESTADO_NOVIOS[c.estado] ?? c.estado}</span>
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: "var(--suave)" }}>Vuestra comercial confirma cada cambio. Los datos de arriba se actualizan cuando lo aprueba.</div>
        </section>
      )}
      {p.comercial && (
        <section aria-label="Vuestra comercial" style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          {p.comercial.foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.comercial.foto} alt={p.comercial.nombre} width={64} height={64} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
            : <span className="av" style={{ width: 64, height: 64, fontSize: 24, background: "#F3AF42", color: "#282828" }}>{p.comercial.nombre.slice(0, 1).toUpperCase()}</span>}
          <div>
            <div style={{ fontSize: 12, color: "var(--suave)" }}>Vuestra comercial</div>
            <strong style={{ fontWeight: 600, fontSize: 16 }}>{p.comercial.nombre}</strong>
            {p.comercial.frase && <div style={{ fontSize: 13, marginTop: 2 }}>{p.comercial.frase}</div>}
            {p.comercial.telefono && <div style={{ fontSize: 13, marginTop: 6 }}><a href={`tel:${p.comercial.telefono.replace(/[^0-9+]/g, "")}`} style={{ color: "#6B4200", fontWeight: 600 }}>{p.comercial.telefono}</a></div>}
          </div>
        </section>
      )}
      <p style={{ margin: 0, fontSize: 12, color: "var(--suave)" }}>Los cambios los confirma siempre vuestra comercial. Este enlace es personal: no lo compartáis.</p>
    </div>
  );
  return (
    <>
    <AltoVisible />
    <main style={{ maxWidth: 520, margin: "0 auto", height: "var(--alto-vis, 100dvh)", display: "flex", flexDirection: "column", background: "#FFF9EE" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 20px 12px", background: "#fff" }}>
        <Image src="/logo-icono.png" alt="Guadalquivir Catering" width={40} height={40} priority style={{ objectFit: "contain", flex: "none" }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{nombres}</h1>
          <p style={{ margin: 0, fontSize: 12, color: "var(--suave)" }}>Vuestra boda{e.fecha ? ` · ${fechaLarga(e.fecha).toLowerCase()}` : ""}</p>
        </div>
      </header>
      <PestanasBoda token={token} yo={{ nombre: p.titular.nombre, posicion: p.titular.posicion }} titulares={nombres} comercial={p.comercial ? { nombre: p.comercial.nombre, foto: p.comercial.foto } : null} miBoda={miBoda} />
    </main>
    </>
  );
}
