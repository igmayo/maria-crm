/** Reglas del panel de usuarios que no dependen de la base de datos (se prueban aparte). */
export const ROLES = ["comercial", "diseno", "almacen", "administracion", "administrador"] as const;
export type Rol = (typeof ROLES)[number];
export const ETIQUETA_ROL: Record<string, string> = {
  administrador: "Administrador", comercial: "Comercial", diseno: "Diseño", almacen: "Almacén", administracion: "Administración",
};

export type EstadoUsuario = "activo" | "invitado" | "desactivado";

/** "invitado" = cuenta activada por el administrador que aún no ha entrado nunca. Sin dato de acceso no afirmamos nada. */
export function estadoUsuario(activo: boolean, ultimoAcceso: string | null | undefined): EstadoUsuario {
  if (!activo) return "desactivado";
  return ultimoAcceso === null ? "invitado" : "activo";
}

export type Invitacion = { ok: true; nombre: string; correo: string; rol: Rol } | { ok: false; error: "nombre" | "correo" | "rol" };

export function validarInvitacion(nombre: string, correo: string, rol: string): Invitacion {
  const n = nombre.trim().replace(/\s+/g, " ");
  const c = correo.trim().toLowerCase();
  if (n.length < 2 || n.length > 80) return { ok: false, error: "nombre" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) || c.length > 200) return { ok: false, error: "correo" };
  if (!(ROLES as readonly string[]).includes(rol)) return { ok: false, error: "rol" };
  return { ok: true, nombre: n, correo: c, rol: rol as Rol };
}

export function urlBase(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** Enlace de un solo uso. El token se consume al crear la contraseña, no al abrir la página (así un escáner de correo no lo gasta). */
export function enlaceInvitacion(base: string, tokenHash: string, tipo: "invite" | "recovery"): string {
  return `${base}/equipo/invitacion?token_hash=${encodeURIComponent(tokenHash)}&type=${tipo}`;
}

export function textoInvitacion(nombre: string, quien: string, enlace: string, reenvio = false): { asunto: string; texto: string } {
  return {
    asunto: reenvio ? "Nuevo enlace para entrar en María" : "Te han invitado a María, el panel de Guadalquivir Catering",
    texto: [
      `Hola ${nombre},`,
      "",
      reenvio
        ? `${quien} te envía un nuevo enlace para crear tu contraseña y entrar en María, el panel del equipo de Guadalquivir Catering.`
        : `${quien} te ha invitado a María, el panel del equipo de Guadalquivir Catering.`,
      "",
      "Crea tu contraseña aquí (el enlace es de un solo uso):",
      enlace,
      "",
      "Si el enlace ha caducado, pide que te envíen otro. Si no esperabas este correo, ignóralo.",
    ].join("\n"),
  };
}

export function contrasenaValida(a: string, b: string): "ok" | "corta" | "distintas" {
  if (a.length < 10) return "corta";
  return a === b ? "ok" : "distintas";
}
