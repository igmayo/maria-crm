"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import TextoMaria from "@/components/TextoMaria";

export interface Mensaje { id: string; autor: "titular" | "maria" | "equipo"; texto: string; nombre: string | null; posicion: number | null; foto: string | null }
interface Yo { nombre: string; posicion: number }
type Local = Mensaje | { id: string; autor: "sistema"; texto: string };

const ERRORES: Record<string, string> = {
  vacio: "Escribe un mensaje para continuar.",
  limite: "Habéis escrito muchos mensajes seguidos. Probad de nuevo dentro de un rato, o hablad con vuestra comercial.",
  enlace: "Este enlace ya no es válido. Pedid uno nuevo a vuestra comercial.",
  sin_configurar: "El chat todavía no está disponible. Volved a probar más tarde.",
  interno: "Ha habido un problema. Inténtalo de nuevo.",
};
const COLOR = ["#0F6B62", "#A14A1F"];
const FONDO_OTRO = ["#EAF4F2", "#FDF1EA"];
const BORDE_OTRO = ["#CFE6E2", "#F0D3C2"];
const SONDEO_MS = 8000;

export default function ChatNovios({ token, yo, titulares, comercial }: { token: string; yo: Yo; titulares: string; comercial: { nombre: string; foto: string | null } | null }) {
  const [mensajes, setMensajes] = useState<Local[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const cabeceras = { "x-boda-token": token };

  const cargar = useCallback(async () => {
    try {
      const r = await fetch("/api/boda", { headers: cabeceras, cache: "no-store" });
      if (!r.ok) { if (r.status === 401) setError(ERRORES.enlace); return; }
      const d = (await r.json()) as { mensajes?: Mensaje[] };
      if (d.mensajes) setMensajes((previo) => {
        // Los avisos del sistema son locales (no se guardan para los novios): se conservan tras el último mensaje recibido.
        const sistema = previo.filter((m) => m.autor === "sistema");
        return [...d.mensajes!, ...sistema];
      });
    } catch { /* sin conexión: se reintenta en el siguiente sondeo */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    cargar();
    const id = setInterval(() => { if (document.visibilityState === "visible") cargar(); }, SONDEO_MS);
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", alVolver); };
  }, [cargar]);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [mensajes.length, enviando]);

  async function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || enviando) return;
    setError(""); setEnviando(true); setTexto("");
    setMensajes((m) => [...m, { id: `local-${Date.now()}`, autor: "titular", texto: limpio, nombre: yo.nombre, posicion: yo.posicion, foto: null }]);
    try {
      const r = await fetch("/api/boda", { method: "POST", headers: { ...cabeceras, "Content-Type": "application/json" }, body: JSON.stringify({ mensaje: limpio }) });
      const d = (await r.json()) as { respuestas?: { autor: string; texto: string }[]; error?: string };
      if (d.error) setError(ERRORES[d.error] ?? ERRORES.interno);
      await cargar();
      const sis = d.respuestas?.filter((x) => x.autor === "sistema") ?? [];
      if (sis.length) setMensajes((m) => [...m, ...sis.map((x, i) => ({ id: `sis-${Date.now()}-${i}`, autor: "sistema" as const, texto: x.texto }))]);
    } catch { setError(ERRORES.interno); } finally { setEnviando(false); }
  }

  const burbuja = { maxWidth: "84%", padding: "12px 14px", overflowWrap: "anywhere" as const };
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div aria-live="polite" style={{ flex: 1, overflowY: "auto", padding: "18px 16px 8px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...burbuja, alignSelf: "flex-start", background: "#fff", border: "1px solid #EFE3C6", borderRadius: "18px 18px 18px 4px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6B4200", marginBottom: 2 }}>María · asistente de IA</div>
          Hola, {titulares}. Soy María, la asistente de IA de Guadalquivir Catering. Os ayudo con los detalles de vuestra boda. Escribidme lo que necesitéis{comercial ? ` y, si hace falta, se lo paso a ${comercial.nombre}` : ""}.
        </div>
        {mensajes.map((m) => {
          if (m.autor === "sistema") return <div key={m.id} style={{ alignSelf: "center", fontSize: 12, color: "var(--suave)", textAlign: "center", maxWidth: "90%" }}>{m.texto}</div>;
          if (m.autor === "titular") {
            const mio = m.posicion === yo.posicion;
            const i = Math.min(Math.max((m.posicion ?? 1) - 1, 0), 1);
            return mio
              ? <div key={m.id} style={{ ...burbuja, alignSelf: "flex-end", background: "#F3AF42", borderRadius: "18px 18px 4px 18px", whiteSpace: "pre-wrap" }}><div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2, textAlign: "right" }}>Tú · {yo.nombre}</div>{m.texto}</div>
              : <div key={m.id} style={{ ...burbuja, alignSelf: "flex-start", background: FONDO_OTRO[i], border: `1px solid ${BORDE_OTRO[i]}`, borderRadius: "18px 18px 18px 4px", whiteSpace: "pre-wrap" }}><div style={{ fontSize: 11, fontWeight: 600, color: COLOR[i], marginBottom: 2 }}>{m.nombre}</div>{m.texto}</div>;
          }
          if (m.autor === "equipo") {
            return (
              <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "flex-end", alignSelf: "flex-start", maxWidth: "90%" }}>
                {m.foto
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.foto} alt="" width={32} height={32} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
                  : <span className="av" style={{ width: 32, height: 32, fontSize: 13, background: "#F3AF42", color: "#282828" }}>{(m.nombre ?? "E").slice(0, 1).toUpperCase()}</span>}
                <div style={{ background: "#fff", border: "1px solid #EFE3C6", borderRadius: "18px 18px 18px 4px", padding: "12px 14px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#6B4200", marginBottom: 2 }}>{m.nombre ?? "Equipo"} · Guadalquivir Catering</div>{m.texto}
                </div>
              </div>
            );
          }
          return <div key={m.id} style={{ ...burbuja, alignSelf: "flex-start", background: "#fff", border: "1px solid #EFE3C6", borderRadius: "18px 18px 18px 4px" }}><div style={{ fontSize: 11, fontWeight: 600, color: "#6B4200", marginBottom: 2 }}>María · asistente de IA</div><TextoMaria texto={m.texto} /></div>;
        })}
        {enviando && <div className="cp-escribe" aria-label="María está escribiendo"><i /><i /><i /></div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div ref={fin} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "8px 16px", overflowX: "auto" }}>
        {[["Horarios del día", "¿Cuáles son los horarios del día de nuestra boda?"], ["Mi menú", "¿Cuál es nuestro menú?"], ["Pedir un cambio", "Quiero pedir un cambio en nuestra boda."]].map(([etiqueta, t]) => (
          <button key={etiqueta} type="button" className="cp-chip" onClick={() => enviar(t)} disabled={enviando} style={{ whiteSpace: "nowrap" }}>{etiqueta}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 16px", background: "#fff", borderTop: "1px solid #EFE3C6" }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} aria-label="Escribe un mensaje" placeholder="Escribe un mensaje" autoComplete="off"
          style={{ flex: 1, minWidth: 0, height: 46, border: "1px solid #E3D3AE", borderRadius: 23, padding: "0 16px", fontSize: 14, outline: 0, background: "#fff", fontFamily: "inherit" }} />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar" style={{ width: 46, height: 46, borderRadius: "50%", border: 0, background: "#F3AF42", color: "#282828", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7z" /></svg>
        </button>
      </form>
    </div>
  );
}
