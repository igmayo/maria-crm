import { describe, it, expect } from "vitest";
import { avisoNovios, avisoEquipo, recordatorio } from "@/lib/avisos-correo";
import { correoHtml, correoTexto } from "@/lib/plantilla-correo";

const marta = { nombre: "Marta", frase: "Llevo vuestra boda de principio a fin.", foto: null };

describe("correos de aviso", () => {
  it("aviso a novios: una respuesta, con la comercial y sin el texto del mensaje", () => {
    const c = avisoNovios("Lucía", marta, 1, "https://x.test/boda/t");
    expect(c.asunto).toBe("Marta ha contestado a vuestro mensaje");
    const html = correoHtml(c.contenido, "https://x.test");
    expect(html).toContain("Ver respuesta");
    expect(html).toContain("Marta</strong>, vuestra comercial");
    expect(html).toContain("Llevo vuestra boda");
    expect(correoTexto(c.contenido)).toContain("Marta, vuestra comercial: Llevo vuestra boda");
  });
  it("aviso a novios: varias respuestas en un solo correo", () => {
    const c = avisoNovios("Lucía", marta, 3, "https://x.test/boda/t");
    expect(c.asunto).toBe("Tenéis 3 respuestas nuevas de vuestra boda");
    expect(correoHtml(c.contenido, "https://x.test")).toContain("Ver respuestas");
  });
  it("sin comercial no inventa un nombre ni deja bloque vacío", () => {
    const c = avisoNovios("Lucía", null, 1, "https://x.test/boda/t");
    expect(c.asunto).toBe("Vuestro equipo ha contestado a vuestro mensaje");
    expect(correoHtml(c.contenido, "https://x.test")).not.toContain("vuestra comercial<");
  });
  it("la foto solo se usa si es https; si no, la inicial", () => {
    const h = (foto: string | null) => correoHtml(avisoNovios("L", { nombre: "Marta", frase: null, foto }, 1, "https://x.test/b").contenido, "https://x.test");
    expect(h("https://f.test/a.jpg")).toContain('src="https://f.test/a.jpg"');
    expect(h("javascript:alert(1)")).not.toContain("javascript:");
    expect(h(null)).toContain(">M<");
  });
  it("los nombres con HTML se escapan", () => {
    const html = correoHtml(avisoNovios("Lu<b>", { nombre: "Ma<i>", frase: "<script>", foto: null }, 1, "https://x.test/b").contenido, "https://x.test");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Lu&lt;b&gt;");
  });
  it("aviso al equipo con motivo y fecha", () => {
    const c = avisoEquipo("Marta", "Lucía y Andrés", "Piden diez invitados más", "https://x.test/equipo/c/1", "sábado 12 de junio de 2027");
    expect(c.asunto).toBe("Lucía y Andrés necesitan una respuesta");
    expect(correoTexto(c.contenido)).toContain("Piden diez invitados más");
    expect(correoTexto(c.contenido)).toContain("https://x.test/equipo/c/1");
  });
  it("recordatorios: 4 horas y 24 horas naturales, sin hablar de laborables", () => {
    const a = recordatorio(4, "Marta", "Lucía y Andrés", "Marta", "https://x.test/c", false);
    const b = recordatorio(24, "Iván", "Lucía y Andrés", "Marta", "https://x.test/c", true);
    expect(correoTexto(a.contenido)).toContain("4 horas");
    expect(correoTexto(b.contenido)).toContain("24 horas");
    expect(b.asunto).toContain("boda de Marta");
    expect(correoTexto(b.contenido)).toContain("reasignarla");
    for (const c of [a, b]) expect(correoTexto(c.contenido).toLowerCase()).not.toContain("laborable");
  });
});
