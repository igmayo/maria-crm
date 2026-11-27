import { describe, it, expect } from "vitest";
import { validarFicha, textoInvitados, textoHorarios } from "@/lib/ficha";
import { caducaEn, enlaceNovios, contenidoEnlaceNovios } from "@/lib/acceso";
import { correoHtml } from "@/lib/plantilla-correo";

function form(o: Record<string, string>) {
  const base: Record<string, string> = { tipo: "boda", estado: "cliente", nombre1: "Lucía", origen: "Chat web" };
  const m = new Map(Object.entries({ ...base, ...o }));
  return { get: (k: string) => m.get(k) ?? null };
}

describe("validar la ficha", () => {
  it("acepta una ficha completa y calcula el total de invitados", () => {
    const r = validarFicha(form({ fecha: "2027-06-12", lugar: " Finca  Los Olivos ", tipo_ceremonia: "civil", hora_ceremonia: "18:00", hora_banquete: "21:00", adultos: "120", ninos: "8", menu: "Cóctel", dato_interes: "Mesa dulce", nombre2: "Andrés", correo2: "A@x.com" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valores.lugar).toBe("Finca Los Olivos");
      expect(r.valores.invitados).toBe(128);
      expect(r.valores.titular2).toMatchObject({ nombre: "Andrés", email: "a@x.com" });
    }
  });
  it("sin adultos ni niños no inventa un total", () => {
    const r = validarFicha(form({}));
    expect(r.ok && r.valores.invitados).toBe(null);
  });
  it("rechaza datos malos", () => {
    expect(validarFicha(form({ nombre1: " " }))).toEqual({ ok: false, error: "titular1" });
    expect(validarFicha(form({ fecha: "2027-13-45" }))).toEqual({ ok: false, error: "fecha" });
    expect(validarFicha(form({ hora_ceremonia: "25:00" }))).toEqual({ ok: false, error: "hora" });
    expect(validarFicha(form({ adultos: "-1" }))).toEqual({ ok: false, error: "numero" });
    expect(validarFicha(form({ adultos: "diez" }))).toEqual({ ok: false, error: "numero" });
    expect(validarFicha(form({ tipo_ceremonia: "mixta" }))).toEqual({ ok: false, error: "opcion" });
    expect(validarFicha(form({ estado: "reservada" }))).toEqual({ ok: false, error: "opcion" });
    expect(validarFicha(form({ correo1: "sin-arroba" }))).toEqual({ ok: false, error: "correo" });
  });
  it("el titular 2 en blanco no se guarda", () => {
    const r = validarFicha(form({ nombre2: "", correo2: "no-importa" }));
    expect(r.ok && r.valores.titular2).toBe(null);
  });
  it("los textos de la ficha", () => {
    expect(textoInvitados({ adultos: 120, ninos: 8, invitados: 128 })).toBe("120 adultos · 8 niños");
    expect(textoInvitados({ adultos: null, ninos: null, invitados: 90 })).toBe("90 invitados");
    expect(textoInvitados({ adultos: null, ninos: null, invitados: null })).toBe("Sin indicar");
    expect(textoHorarios({ hora_ceremonia: "18:00:00", hora_banquete: "21:00:00" })).toBe("Ceremonia 18:00 · banquete 21:00");
    expect(textoHorarios({ hora_ceremonia: null, hora_banquete: null })).toBe("Sin indicar");
  });
});

describe("acceso de los novios", () => {
  it("el enlace se cierra 30 días después de la boda", () => {
    expect(caducaEn("2027-06-12").toISOString()).toBe("2027-07-12T23:59:59.000Z");
    expect(caducaEn("2027-12-20").toISOString()).toBe("2028-01-19T23:59:59.000Z");
  });
  it("el enlace lleva el token codificado", () => {
    expect(enlaceNovios("https://x.test", "a/b")).toBe("https://x.test/boda/a%2Fb");
  });
  it("el correo a los novios nombra a la comercial y escapa el nombre", () => {
    const { asunto, contenido } = contenidoEnlaceNovios("Lu<cía>", "Marta", "https://x.test/boda/t");
    expect(asunto).toContain("acceso personal");
    expect(contenido.parrafos[0]).toContain("Marta, vuestra comercial");
    const html = correoHtml(contenido, "http://localhost:3000");
    expect(html).toContain("Lu&lt;cía&gt;");
    expect(html).toContain("Entrar a mi boda");
  });
  it("sin comercial el correo no inventa un nombre", () => {
    expect(contenidoEnlaceNovios("Lucía", null, "https://x.test/boda/t").contenido.parrafos[0]).toContain("Vuestro equipo");
  });
});
