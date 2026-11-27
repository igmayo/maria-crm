/** Rutas del panel del equipo que exigen sesión. El login queda fuera. */
export function exigeSesion(ruta: string): boolean {
  if (ruta === "/equipo/login" || ruta.startsWith("/equipo/login/")) return false;
  return ruta === "/equipo" || ruta.startsWith("/equipo/");
}
