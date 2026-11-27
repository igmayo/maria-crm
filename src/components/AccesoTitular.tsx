"use client";
import { useActionState, useEffect, useState } from "react";
import { gestionarAcceso, type EstadoAcceso } from "@/app/equipo/(panel)/c/[id]/acceso/acciones";

export default function AccesoTitular({ conversacion, contacto, tieneCorreo }: { conversacion: string; contacto: string; tieneCorreo: boolean }) {
  const [estado, accion, enviando] = useActionState<EstadoAcceso, FormData>(gestionarAcceso, {});
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    setCopiado(false);
    if (estado.copiar && estado.enlace) navigator.clipboard?.writeText(estado.enlace).then(() => setCopiado(true)).catch(() => setCopiado(false));
  }, [estado]);
  return (
    <form action={accion} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="conversacion" value={conversacion} />
      <input type="hidden" name="contacto" value={contacto} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {tieneCorreo && <button className="btn-pri" type="submit" name="accion" value="enviar" disabled={enviando}>Enviar por correo</button>}
        <button className="btn-sec" type="submit" name="accion" value="copiar" disabled={enviando}>Copiar enlace</button>
      </div>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
      {estado.mensaje && (
        <div className="aviso-ok" role="status">
          {estado.mensaje}{estado.enlace && copiado && " Ya está copiado."}
          {estado.enlace && <input className="fi" readOnly value={estado.enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace personal" style={{ marginTop: 8 }} />}
        </div>
      )}
      <button className="enlace-boton" type="submit" name="accion" value="anular" disabled={enviando} style={{ alignSelf: "flex-start", fontSize: 13, color: "#6B4200", textDecoration: "underline" }}
        onClick={(e) => { if (!confirm("Los enlaces actuales de este titular dejarán de funcionar al momento. ¿Anular y crear uno nuevo?")) e.preventDefault(); }}>
        Anular enlaces y crear uno nuevo
      </button>
    </form>
  );
}
