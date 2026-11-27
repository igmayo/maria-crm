/** Reglas del perfil de comercial (D42). Sin dependencias de servidor: se prueba aparte. */
export const MAX_FOTO = 5 * 1024 * 1024;
export const MAX_FRASE = 140;

export type ErrorPerfil = "nombre" | "frase" | "telefono" | "foto_tipo" | "foto_tamano";
export interface ValoresPerfil { nombre: string; frase: string | null; telefono: string | null }

const limpiar = (v: unknown, max: number): string | null => {
  const t = String(v ?? "").replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max + 1) : null;
};

export function validarPerfil(f: { get(k: string): unknown }): { ok: true; valores: ValoresPerfil } | { ok: false; error: ErrorPerfil } {
  const nombre = limpiar(f.get("nombre"), 80);
  if (!nombre || nombre.length > 80) return { ok: false, error: "nombre" };
  const frase = limpiar(f.get("frase"), MAX_FRASE);
  if (frase && frase.length > MAX_FRASE) return { ok: false, error: "frase" };
  const telefono = limpiar(f.get("telefono"), 40);
  if (telefono && (telefono.length > 40 || !/^[0-9+()\s.-]{6,40}$/.test(telefono))) return { ok: false, error: "telefono" };
  return { ok: true, valores: { nombre, frase, telefono } };
}

/** Tipo real de la imagen por sus primeros bytes, no por el nombre ni el tipo que declare el navegador. */
export function tipoImagen(b: Uint8Array): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}
