import Image from "next/image";
import type { Metadata } from "next";
import { cargarPortal } from "@/lib/acceso-servidor";
import { fechaLarga } from "@/lib/formato";
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
  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "28px 16px 48px", display: "flex", flexDirection: "column", gap: 20 }}>
      <Image src="/logo-guadalquivir.png" alt="Guadalquivir Catering" width={180} height={60} priority style={{ height: "auto" }} />
      <header>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{nombres}</h1>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--suave)" }}>Vuestra boda{e.fecha ? ` · ${fechaLarga(e.fecha).toLowerCase()}` : ""}</p>
      </header>
      <section aria-label="Los datos de vuestra boda" style={{ background: "#fff", border: "1px solid var(--borde)", borderRadius: 16, padding: 20 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 600 }}>Los datos de vuestra boda</h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "110px 1fr", gap: "10px 12px", fontSize: 14 }}>
          {filas.map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}><dt style={{ color: "var(--suave)" }}>{k}</dt><dd style={{ margin: 0 }}>{v ?? <span style={{ color: "var(--suave)" }}>Aún por confirmar</span>}</dd></div>
          ))}
        </dl>
      </section>
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
    </main>
  );
}
