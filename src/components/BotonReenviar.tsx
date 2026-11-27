"use client";
import { useActionState } from "react";
import { reenviarInvitacion, type EstadoInvitar } from "@/app/equipo/(panel)/usuarios/acciones";

export default function BotonReenviar({ id }: { id: string }) {
  const [estado, accion, enviando] = useActionState<EstadoInvitar, FormData>(reenviarInvitacion, {});
  return (
    <form action={accion} style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <input type="hidden" name="usuario" value={id} />
      <button className="enlace-boton" type="submit" disabled={enviando} style={{ fontSize: 12 }}>{enviando ? "Enviando…" : "Reenviar invitación"}</button>
      {estado.error && <span className="error" role="alert" style={{ padding: "6px 10px" }}>{estado.error}</span>}
      {estado.mensaje && <span className="aviso-ok" role="status">{estado.mensaje}
        {estado.enlace && <input className="fi" readOnly value={estado.enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" style={{ marginTop: 6 }} />}</span>}
    </form>
  );
}
