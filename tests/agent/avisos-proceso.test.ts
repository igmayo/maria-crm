import { describe, it, expect } from "vitest";
import { procesarAvisos, VENTANA_NOVIOS_MS, PLAZO_4H, PLAZO_24H } from "@/lib/avisos";
import { falsoSupabase } from "./falso-supabase";

// Los avisos que crea el proceso llevan la hora real: el reloj de la prueba parte de hace 30 horas para que ambos cuadren.
const T0 = Date.now() - 30 * 3600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function escenario(extra: Record<string, Record<string, unknown>[]> = {}) {
  return falsoSupabase({
    perfiles: [
      { id: "m", nombre: "Marta", email: "marta@x.test", rol: "comercial", activo: true, frase: "Hola", foto_url: null },
      { id: "a", nombre: "Iván", email: "ivan@x.test", rol: "administrador", activo: true },
    ],
    eventos: [{ id: "e1", fecha: "2027-09-01", responsable_id: "m" }],
    contactos: [{ id: "k1", evento_id: "e1", nombre: "Lucía", email: "lucia@x.test", posicion: 1 }, { id: "k2", evento_id: "e1", nombre: "Andrés", email: null, posicion: 2 }],
    conversaciones: [{ id: "c1", evento_id: "e1", estado: "te_toca", responsable_id: "m" }],
    mensajes: [], avisos: [], accesos: [], ...extra,
  });
}
const buzon = () => { const enviados: { para: string; asunto: string; texto: string }[] = []; return { enviados, envio: async (c: { para: string; asunto: string; texto: string }) => { enviados.push(c); return true; } }; };

describe("proceso de avisos", () => {
  it("al equipo: un correo a la responsable con enlace, y no se repite", async () => {
    const sb = escenario({ avisos: [{ id: "x1", tipo: "equipo_te_toca", conversacion_id: "c1", motivo: "Piden diez más", creado_en: iso(T0), enviado_en: null, descartado_en: null }] });
    const b = buzon();
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + 1000, recordatorios: false });
    expect(r.enviados).toBe(1);
    expect(b.enviados.map((e) => e.para)).toEqual(["marta@x.test"]);
    expect(b.enviados[0].texto).toContain("https://app.test/equipo/c/c1");
    expect(b.enviados[0].texto).toContain("Piden diez más");
    const r2 = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + 2000, recordatorios: false });
    expect(r2.enviados).toBe(0);
    expect(b.enviados.length).toBe(1);
  });
  it("sin responsable, el aviso va a los administradores", async () => {
    const sb = escenario({ conversaciones: [{ id: "c1", evento_id: "e1", estado: "sin_asignar", responsable_id: null }], eventos: [{ id: "e1", fecha: "2027-09-01", responsable_id: null }], avisos: [{ id: "x1", tipo: "equipo_te_toca", conversacion_id: "c1", creado_en: iso(T0), enviado_en: null, descartado_en: null }] });
    const b = buzon();
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + 1000, recordatorios: false });
    expect(b.enviados.map((e) => e.para)).toEqual(["ivan@x.test"]);
  });
  it("si la conversación ya no espera al equipo, el aviso se descarta", async () => {
    const sb = escenario({ conversaciones: [{ id: "c1", evento_id: "e1", estado: "humano", responsable_id: "m" }], avisos: [{ id: "x1", tipo: "equipo_te_toca", conversacion_id: "c1", creado_en: iso(T0), enviado_en: null, descartado_en: null }] });
    const b = buzon();
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + 1000, recordatorios: false });
    expect(r.descartados).toBe(1); expect(b.enviados.length).toBe(0);
  });
  it("a novios: espera la ventana y junta varias respuestas en un correo con enlace nuevo", async () => {
    const av = (id: string, t: number) => ({ id, tipo: "novios_respuesta", conversacion_id: "c1", contacto_id: "k1", creado_en: iso(t), enviado_en: null, descartado_en: null });
    const sb = escenario({ avisos: [av("n1", T0), av("n2", T0 + 60_000)] });
    const b = buzon();
    const antes = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + VENTANA_NOVIOS_MS - 1000, recordatorios: false });
    expect(antes.pendientes).toBe(2); expect(b.enviados.length).toBe(0);
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + VENTANA_NOVIOS_MS + 1000, recordatorios: false });
    expect(r.enviados).toBe(2);
    expect(b.enviados.length).toBe(1);
    expect(b.enviados[0].para).toBe("lucia@x.test");
    expect(b.enviados[0].asunto).toBe("Tenéis 2 respuestas nuevas de vuestra boda");
    expect(b.enviados[0].texto).toMatch(/https:\/\/app\.test\/boda\/[A-Za-z0-9_-]{20,}/);
    expect(sb.tablas.accesos.length).toBe(1);
  });
  it("a novios: si ya abrieron el chat después de la respuesta, no se envía", async () => {
    const sb = escenario({ avisos: [{ id: "n1", tipo: "novios_respuesta", conversacion_id: "c1", contacto_id: "k1", creado_en: iso(T0), enviado_en: null, descartado_en: null }],
      accesos: [{ id: "ac", contacto_id: "k1", revocado_en: null, ultimo_uso: iso(T0 + 30_000) }] });
    const b = buzon();
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + VENTANA_NOVIOS_MS + 1000, recordatorios: false });
    expect(r.descartados).toBe(1); expect(b.enviados.length).toBe(0);
  });
  it("a novios: sin correo del titular no se envía nada", async () => {
    const sb = escenario({ avisos: [{ id: "n1", tipo: "novios_respuesta", conversacion_id: "c1", contacto_id: "k2", creado_en: iso(T0), enviado_en: null, descartado_en: null }] });
    const b = buzon();
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + VENTANA_NOVIOS_MS + 1000, recordatorios: false });
    expect(r.descartados).toBe(1); expect(b.enviados.length).toBe(0);
  });
  it("un correo que falla se reintenta: queda pendiente", async () => {
    const sb = escenario({ avisos: [{ id: "x1", tipo: "equipo_te_toca", conversacion_id: "c1", creado_en: iso(T0), enviado_en: null, descartado_en: null }] });
    const r = await procesarAvisos(sb, { base: "https://app.test", envio: async () => false, ahora: T0 + 1000, recordatorios: false });
    expect(r.enviados).toBe(0); expect(r.pendientes).toBe(1);
    expect(sb.tablas.avisos[0].enviado_en).toBe(null);
  });
  it("recordatorios: 4 horas a la responsable, 24 horas también al administrador, una sola vez cada uno", async () => {
    const sb = escenario({ mensajes: [{ id: "t1", conversacion_id: "c1", autor: "titular", creado_en: iso(T0) }] });
    const b = buzon();
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + PLAZO_4H + 1000 });
    expect(b.enviados.map((e) => e.para)).toEqual(["marta@x.test"]);
    expect(b.enviados[0].asunto).toContain("siguen esperando");
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + PLAZO_4H + 60_000 });
    expect(b.enviados.length).toBe(1);
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + PLAZO_24H + 1000 });
    expect(b.enviados.slice(1).map((e) => e.para).sort()).toEqual(["ivan@x.test", "marta@x.test"]);
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + PLAZO_24H + 120_000 });
    expect(b.enviados.length).toBe(3);
  });
  it("si el equipo ya contestó, no hay recordatorio", async () => {
    const sb = escenario({ mensajes: [{ id: "t1", conversacion_id: "c1", autor: "titular", creado_en: iso(T0) }, { id: "e1", conversacion_id: "c1", autor: "equipo", creado_en: iso(T0 + 3600_000) }] });
    const b = buzon();
    await procesarAvisos(sb, { base: "https://app.test", envio: b.envio, ahora: T0 + PLAZO_24H + 1000 });
    expect(b.enviados.length).toBe(0);
  });
});

describe("aviso único al equipo (D46)", () => {
  it("solo un correo mientras el equipo no conteste, y otro cuando vuelve a hacer falta", async () => {
    const { avisarEquipoUnaVez } = await import("@/lib/avisos");
    const { falsoSupabase } = await import("./falso-supabase");
    const sb = falsoSupabase({ mensajes: [], avisos: [] });
    expect(await avisarEquipoUnaVez(sb, "c1", "Reunión pedida")).toBe(true);
    expect(await avisarEquipoUnaVez(sb, "c1", "Ha dejado sus datos")).toBe(false);
    expect(await avisarEquipoUnaVez(sb, "c2", "Otra conversación")).toBe(true);
    expect(sb.tablas.avisos).toHaveLength(2);
    await new Promise((r) => setTimeout(r, 5));
    sb.tablas.mensajes.push({ id: "m1", conversacion_id: "c1", autor: "equipo", creado_en: new Date().toISOString() });
    await new Promise((r) => setTimeout(r, 5));
    expect(await avisarEquipoUnaVez(sb, "c1", "Vuelven a escribir")).toBe(true);
    expect(sb.tablas.avisos).toHaveLength(3);
  });
});
