import { describe, it, expect } from "vitest";
import { iniciales, etiquetaFecha, encabezadoDia, fechaLarga, sinAcentos } from "@/lib/formato";

const ahora = new Date("2026-11-27T12:00:00Z");

describe("formato", () => {
  it("iniciales de una pareja y de un nombre", () => {
    expect(iniciales("Lucía y Andrés")).toBe("LA");
    expect(iniciales("Carmen y Pablo")).toBe("CP");
    expect(iniciales("Sofía")).toBe("S");
    expect(iniciales("Elena R. (nuevo)")).toBe("ER");
  });
  it("etiquetas de fecha", () => {
    expect(etiquetaFecha("2026-11-27T09:44:00Z", ahora)).toBe("10:44");
    expect(etiquetaFecha("2026-11-26T09:44:00Z", ahora)).toBe("Ayer");
    expect(etiquetaFecha("2026-11-20T09:44:00Z", ahora)).toBe("20/11");
  });
  it("encabezado del día", () => {
    expect(encabezadoDia("2026-11-27T09:44:00Z", ahora)).toBe("Hoy");
    expect(encabezadoDia("2026-11-26T09:44:00Z", ahora)).toBe("Ayer");
  });
  it("fecha larga y búsqueda sin acentos", () => {
    expect(fechaLarga("2027-06-12")).toBe("Sábado 12 de junio");
    expect(fechaLarga(null)).toBe("Sin fecha");
    expect(sinAcentos("Lucía")).toBe("lucia");
  });
});
