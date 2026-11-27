import { describe, it, expect } from "vitest";
import { normalizarValor, mostrarValor, valorActual, esCampo, CAMPOS, COLUMNA } from "@/lib/cambios";

describe("cambios que piden los novios", () => {
  it("fechas: solo AAAA-MM-DD real", () => {
    expect(normalizarValor("fecha", "2027-06-12")).toEqual({ ok: true, valor: "2027-06-12" });
    for (const malo of ["12 de junio", "2027-02-30", "2027-13-01", "12/06/2027", ""]) expect(normalizarValor("fecha", malo).ok).toBe(false);
  });
  it("horas: HH:MM de 24 horas", () => {
    expect(normalizarValor("hora_banquete", "22:00")).toEqual({ ok: true, valor: "22:00" });
    for (const malo of ["25:00", "8:00", "las diez", "22:60"]) expect(normalizarValor("hora_ceremonia", malo).ok).toBe(false);
  });
  it("invitados: número entero de hasta 4 cifras", () => {
    expect(normalizarValor("adultos", " 130 ")).toEqual({ ok: true, valor: 130 });
    for (const malo of ["-5", "diez", "1.5", "12345"]) expect(normalizarValor("ninos", malo).ok).toBe(false);
  });
  it("ceremonia, espacio, menú y otro", () => {
    expect(normalizarValor("tipo_ceremonia", "Civil")).toEqual({ ok: true, valor: "civil" });
    expect(normalizarValor("tipo_ceremonia", "mixta").ok).toBe(false);
    expect(normalizarValor("espacio", "Finca Los Olivos").ok).toBe(true);
    expect(normalizarValor("espacio", "a".repeat(121)).ok).toBe(false);
    expect(normalizarValor("menu", "a".repeat(1001)).ok).toBe(false);
    expect(normalizarValor("otro", "Mesa dulce").ok).toBe(true);
  });
  it("todos los campos aplicables tienen su columna y 'otro' no", () => {
    for (const c of CAMPOS) if (c !== "otro") expect(COLUMNA[c]).toBeTruthy();
    expect(esCampo("otro")).toBe(true);
    expect(esCampo("dato_interes")).toBe(false);
    expect(esCampo("estado")).toBe(false);
    expect(Object.values(COLUMNA)).not.toContain("dato_interes");
  });
  it("cómo se enseñan los valores", () => {
    expect(mostrarValor("hora_banquete", "22:00:00")).toBe("22:00");
    expect(mostrarValor("tipo_ceremonia", "civil")).toBe("Civil");
    expect(mostrarValor("adultos", null)).toBe("Sin indicar");
    expect(mostrarValor("fecha", "2027-06-12").toLowerCase()).toContain("junio");
  });
  it("el valor actual sale de la ficha", () => {
    const e = { fecha: null, lugar: "Finca", tipo_ceremonia: null, hora_ceremonia: null, hora_banquete: "21:00:00", adultos: 120, ninos: null, menu: null };
    expect(valorActual("espacio", e)).toBe("Finca");
    expect(valorActual("hora_banquete", e)).toBe("21:00:00");
    expect(valorActual("otro", e)).toBe(null);
  });
});
