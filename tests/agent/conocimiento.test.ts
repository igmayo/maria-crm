import { describe, it, expect } from "vitest";
import { validarRespuesta, agruparPreguntas, esPreguntaSinResponder } from "@/lib/conocimiento";

describe("Enseñar a María (D47)", () => {
  it("limpia espacios y valida largos", () => {
    const v = validarRespuesta({ pregunta: "  ¿Hacéis   menú?  ", respuesta: "Sí.\r\n\r\n\r\n\r\nClaro", categoria: " Menús " });
    expect(v).toEqual({ ok: true, valor: { pregunta: "¿Hacéis menú?", respuesta: "Sí.\n\nClaro", categoria: "Menús" } });
    expect(validarRespuesta({ pregunta: "a", respuesta: "bien", categoria: "x" })).toEqual({ ok: false, error: "pregunta" });
    expect(validarRespuesta({ pregunta: "hola", respuesta: "x".repeat(1501), categoria: "x" })).toEqual({ ok: false, error: "respuesta" });
    expect(validarRespuesta({ pregunta: "hola", respuesta: "bien", categoria: "" })).toEqual({ ok: false, error: "categoria" });
  });
  it("agrupa preguntas iguales sin mirar acentos ni mayúsculas y ordena por frecuencia", () => {
    const g = agruparPreguntas([
      { id: "1", descripcion: "¿Admiten perros?", creado_en: "2026-11-01", conversacion_id: "c1" },
      { id: "2", descripcion: "admiten PERROS", creado_en: "2026-11-03", conversacion_id: "c2" },
      { id: "3", descripcion: "¿Hay parking?", creado_en: "2026-11-02", conversacion_id: "c3" },
    ]);
    expect(g).toHaveLength(2);
    expect(g[0].veces).toBe(2);
    expect(g[0].ids).toEqual(["1", "2"]);
    expect(g[0].conversacionId).toBe("c2");
  });
  it("ignora avisos que no son preguntas de clientes", () => {
    expect(esPreguntaSinResponder("María no pudo contestar por un fallo técnico")).toBe(false);
    expect(esPreguntaSinResponder(null)).toBe(false);
    expect(esPreguntaSinResponder("¿Tenéis menú vegano?")).toBe(true);
  });
});
