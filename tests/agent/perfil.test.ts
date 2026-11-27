import { describe, it, expect } from "vitest";
import { validarPerfil, tipoImagen } from "@/lib/perfil";

const form = (o: Record<string, string>) => { const m = new Map(Object.entries({ nombre: "Marta", ...o })); return { get: (k: string) => m.get(k) ?? null }; };

describe("perfil de comercial", () => {
  it("acepta un perfil completo y limpia espacios", () => {
    const r = validarPerfil(form({ nombre: "  Marta   López ", frase: "Llevo vuestra boda de principio a fin.", telefono: "600 000 000" }));
    expect(r).toEqual({ ok: true, valores: { nombre: "Marta López", frase: "Llevo vuestra boda de principio a fin.", telefono: "600 000 000" } });
  });
  it("frase y teléfono son opcionales", () => {
    const r = validarPerfil(form({}));
    expect(r.ok && r.valores).toEqual({ nombre: "Marta", frase: null, telefono: null });
  });
  it("rechaza datos malos", () => {
    expect(validarPerfil(form({ nombre: " " }))).toEqual({ ok: false, error: "nombre" });
    expect(validarPerfil(form({ frase: "a".repeat(141) }))).toEqual({ ok: false, error: "frase" });
    expect(validarPerfil(form({ frase: "a".repeat(140) })).ok).toBe(true);
    expect(validarPerfil(form({ telefono: "abc" }))).toEqual({ ok: false, error: "telefono" });
  });
  it("reconoce la imagen por su contenido, no por su nombre", () => {
    expect(tipoImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.ext).toBe("jpg");
    expect(tipoImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.ext).toBe("png");
    expect(tipoImagen(new TextEncoder().encode("RIFF1234WEBPVP8 "))?.ext).toBe("webp");
    expect(tipoImagen(new TextEncoder().encode("<svg onload=alert(1)></svg>"))).toBe(null);
    expect(tipoImagen(new TextEncoder().encode("GIF89a......"))).toBe(null);
  });
});
