/** Rutas del panel del equipo que exigen sesión. El login y la página de invitación (donde se crea la contraseña) quedan fuera. */
export function exigeSesion(ruta: string): boolean {
  if (ruta === "/equipo/login" || ruta.startsWith("/equipo/login/")) return false;
  if (ruta === "/equipo/invitacion" || ruta.startsWith("/equipo/invitacion/")) return false;
  return ruta === "/equipo" || ruta.startsWith("/equipo/");
}
