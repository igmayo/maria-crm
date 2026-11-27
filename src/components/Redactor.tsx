"use client";
import { useState } from "react";

export default function Redactor({ conversacion, destinatarios, accion }: { conversacion: string; destinatarios: string; accion: (f: FormData) => void | Promise<void> }) {
  const [modo, setModo] = useState<"equipo" | "nota_interna">("equipo");
  const nota = modo === "nota_interna";
  return (
    <form action={accion} className="redactor">
      <input type="hidden" name="conversacion" value={conversacion} />
      <input type="hidden" name="modo" value={modo} />
      <div className="pestanas">
        <button type="button" aria-pressed={!nota} onClick={() => setModo("equipo")} className={!nota ? "pest on" : "pest"}>Responder a los novios</button>
        <button type="button" aria-pressed={nota} onClick={() => setModo("nota_interna")} className={nota ? "pest nota on" : "pest nota"}>Nota interna</button>
      </div>
      <div className="linea-redactor">
        <input name="texto" aria-label="Escribe un mensaje" autoComplete="off" required
          placeholder={nota ? "Nota solo para el equipo" : `Escribe un mensaje a ${destinatarios}`} className="campo-msg" />
        <button type="submit" aria-label="Enviar" className="enviar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7z" /></svg>
        </button>
      </div>
    </form>
  );
}
