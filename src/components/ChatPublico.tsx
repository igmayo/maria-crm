"use client";
import { useEffect, useRef, useState } from "react";

interface Msg { autor: "titular" | "maria" | "sistema" | "equipo"; texto: string }

const SALUDO = "Hola, soy María, la asistente de IA de Guadalquivir Catering. Resuelvo dudas sobre nuestros servicios y te ayudo a pedir una reunión con el equipo. ¿Qué celebras?";
const CLAVE = "maria-chat-token";
const ERRORES: Record<string, string> = {
  vacio: "Escribe un mensaje para continuar.",
  ocupado: "Ahora mismo hay mucha gente escribiendo. Inténtalo de nuevo en unos minutos.",
  limite: "Esta conversación ha llegado a su límite. El equipo seguirá contigo por correo o teléfono.",
  sin_configurar: "El chat todavía no está disponible. Vuelve a probar más tarde.",
  interno: "Ha habido un problema. Inténtalo de nuevo.",
};

function leerToken(): string | null { try { return localStorage.getItem(CLAVE); } catch { return null; } }
function guardarToken(t: string) { try { localStorage.setItem(CLAVE, t); } catch { /* sin almacenamiento */ } }

export default function ChatPublico() {
  const [mensajes, setMensajes] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = leerToken();
    if (!t) return;
    fetch("/api/chat", { headers: { "x-chat-token": t } })
      .then((r) => r.json())
      .then((d: { mensajes?: Msg[] }) => { if (d.mensajes?.length) setMensajes(d.mensajes); })
      .catch(() => {});
  }, []);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes, enviando]);

  async function enviar(t: string) {
    const limpio = t.trim();
    if (!limpio || enviando) return;
    setError("");
    setEnviando(true);
    setTexto("");
    setMensajes((m) => [...m, { autor: "titular", texto: limpio }]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: limpio, token: leerToken() ?? undefined }),
      });
      const d = (await r.json()) as { token?: string; respuestas?: Msg[]; error?: string };
      if (d.token) guardarToken(d.token);
      if (d.error) setError(ERRORES[d.error] ?? ERRORES.interno);
      if (d.respuestas?.length) setMensajes((m) => [...m, ...d.respuestas!]);
    } catch {
      setError(ERRORES.interno);
    } finally {
      setEnviando(false);
    }
  }

  const vacio = mensajes.length === 0;
  return (
    <>
      <div className="cp-hilo" aria-live="polite">
        <div className="cp-mr"><b>María</b>{SALUDO}</div>
        {mensajes.map((m, i) =>
          m.autor === "titular" ? <div key={i} className="cp-us">{m.texto}</div>
          : m.autor === "sistema" ? <div key={i} className="cp-sis">{m.texto}</div>
          : <div key={i} className="cp-mr"><b>{m.autor === "equipo" ? "Equipo" : "María"}</b>{m.texto}</div>)}
        {enviando && <div className="cp-escribe" aria-label="María está escribiendo"><i /><i /><i /></div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div ref={fin} />
      </div>
      {vacio && (
        <div className="cp-chips">
          {["Una boda", "Evento de empresa", "Otra consulta"].map((c) => <button key={c} className="cp-chip" onClick={() => enviar(c)}>{c}</button>)}
        </div>
      )}
      <div className="cp-legal">Al escribir aceptas que guardemos esta conversación para atenderte.</div>
      <form className="cp-pie" onSubmit={(e) => { e.preventDefault(); enviar(texto); }}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} aria-label="Escribe un mensaje" placeholder="Escribe un mensaje" autoComplete="off" />
        <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7z" /></svg>
        </button>
      </form>
    </>
  );
}
