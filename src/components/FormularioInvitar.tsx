"use client";
import { useActionState } from "react";
import { invitarUsuario, type EstadoInvitar } from "@/app/equipo/(panel)/usuarios/acciones";
import { ROLES, ETIQUETA_ROL } from "@/lib/usuarios";

export default function FormularioInvitar() {
  const [estado, accion, enviando] = useActionState<EstadoInvitar, FormData>(invitarUsuario, {});
  return (
    <form action={accion} className="inv">
      <h2>Invitar usuario</h2>
      {estado.error && <p className="error" role="alert">{estado.error}</p>}
      {estado.mensaje && (
        <div className="aviso-ok" role="status">
          {estado.mensaje}
          {estado.enlace && <input className="fi" readOnly value={estado.enlace} onFocus={(e) => e.currentTarget.select()} aria-label="Enlace de invitación" style={{ marginTop: 8 }} />}
        </div>
      )}
      <div className="fila">
        <label className="campo"><span>Nombre</span><input className="fi" name="nombre" required maxLength={80} /></label>
        <label className="campo"><span>Correo</span><input className="fi" name="correo" type="email" required maxLength={200} /></label>
        <label className="campo"><span>Rol</span>
          <select className="fi" name="rol" defaultValue="comercial">{ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}</select>
        </label>
      </div>
      <p className="nota">Recibirá un correo para crear su contraseña.</p>
      <button className="btn-pri" type="submit" disabled={enviando}>{enviando ? "Enviando…" : "Enviar invitación"}</button>
    </form>
  );
}
