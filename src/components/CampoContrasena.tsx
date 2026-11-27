"use client";
import { useState } from "react";

export default function CampoContrasena() {
  const [ver, setVer] = useState(false);
  return (
    <label className="lb">
      Contraseña
      <span style={{ position: "relative", display: "block" }}>
        <input className="in" name="contrasena" type={ver ? "text" : "password"} autoComplete="current-password" required style={{ paddingRight: 96 }} />
        <button type="button" onClick={() => setVer(!ver)} className="enlace-boton" style={{ position: "absolute", right: 6, top: 4, height: 44 }}>
          {ver ? "Ocultar" : "Mostrar"}
        </button>
      </span>
    </label>
  );
}
