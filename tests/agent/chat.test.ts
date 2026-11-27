import { describe, it, expect } from "vitest";
import { procesarMensaje, cargarHistorial, LIMITE_CONVERSACIONES_POR_HORA, LIMITE_MENSAJES_POR_CONVERSACION, MAX_TEXTO } from "@/lib/chat/servicio";
import type { Almacen, Contexto, Lead } from "@/lib/chat/servicio";
import { generarToken, huella } from "@/lib/chat/token";
import type { ClienteLLM, RespuestaLLM } from "@/lib/agent";

function almacenMemoria() {
  const convs = new Map<string, Contexto & { hash: string; mensajes: { autor: string; texto: string }[] }>();
  const log: string[] = [];
  const leads: Lead[] = [];
  let n = 0;
  const a: Almacen & { convs: typeof convs; log: string[]; leads: Lead[]; creadasHora: number } = {
    convs, log, leads, creadasHora: 0,
    async contarCreadasUltimaHora() { return a.creadasHora + convs.size; },
    async crear(hash) { n++; const c = { conversacionId: `c${n}`, contactoId: `k${n}`, eventoId: `e${n}`, estado: "maria", hash, mensajes: [] }; convs.set(c.conversacionId, c); return c; },
    async porToken(hash) { return [...convs.values()].find((c) => c.hash === hash) ?? null; },
    async contarMensajesTitular(id) { return convs.get(id)!.mensajes.filter((m) => m.autor === "titular").length; },
    async guardarMensaje(m) { convs.get(m.conversacionId)!.mensajes.push({ autor: m.autor, texto: m.texto }); },
    async historial(id, lim) { return convs.get(id)!.mensajes.slice(-lim); },
    async buscarConocimiento() { log.push("buscar"); return [{ pregunta: "¿Menú infantil?", respuesta: "Sí." }]; },
    async guardarLead(_c, l) { log.push("lead"); leads.push(l); },
    async proponerReunion() { log.push("reunion"); },
    async avisarEquipo(_c, m) { log.push("aviso:" + m); },
    async registrarEjecucion() { log.push("ejecucion"); },
  };
  return a;
}
const texto = (t: string): RespuestaLLM => ({ contenido: [{ type: "text", text: t }], parada: "end_turn", tokensEntrada: 1, tokensSalida: 1 });
const uso = (name: string, input: Record<string, unknown>): RespuestaLLM => ({ contenido: [{ type: "tool_use", id: "t", name, input }], parada: "tool_use", tokensEntrada: 1, tokensSalida: 1 });
const guion = (...r: RespuestaLLM[]): ClienteLLM & { vistos: unknown[] } => {
  let i = 0; const vistos: unknown[] = [];
  return { vistos, crear: async (p) => { vistos.push(structuredClone(p)); return r[Math.min(i++, r.length - 1)]; } };
};

describe("token", () => {
  it("genera claves largas y distintas, y la huella no revela la clave", () => {
    const a = generarToken(), b = generarToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(huella(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(huella(a)).not.toContain(a);
  });
});

describe("chat público", () => {
  it("primer mensaje: crea la conversación, guarda los dos mensajes y registra la ejecución", async () => {
    const al = almacenMemoria();
    const r = await procesarMensaje({ almacen: al, llm: guion(texto("¡Enhorabuena!")), modelo: "m", texto: "Una boda" });
    expect(r.token).toBeTruthy();
    expect(r.respuestas).toEqual([{ autor: "maria", texto: "¡Enhorabuena!" }]);
    expect([...al.convs.values()][0].mensajes.map((m) => m.autor)).toEqual(["titular", "maria"]);
    expect(al.log).toContain("ejecucion");
  });
  it("con la misma clave continúa la conversación y el modelo ve el historial previo", async () => {
    const al = almacenMemoria();
    const llm = guion(texto("Hola"), texto("¿Cuántos invitados?"));
    const r1 = await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "Una boda" });
    await procesarMensaje({ almacen: al, llm, modelo: "m", token: r1.token, texto: "En septiembre" });
    expect(al.convs.size).toBe(1);
    expect(JSON.stringify(llm.vistos[1])).toContain("Una boda");
  });
  it("una clave desconocida abre una conversación nueva y no entra en otra", async () => {
    const al = almacenMemoria();
    const llm = guion(texto("ok"));
    await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "secreto de la primera" });
    const r = await procesarMensaje({ almacen: al, llm, modelo: "m", token: "clave-inventada", texto: "hola" });
    expect(al.convs.size).toBe(2);
    expect(r.token).not.toBe("clave-inventada");
    expect(JSON.stringify(llm.vistos[1])).not.toContain("secreto de la primera");
  });
  it("María guarda un lead y propone reunión con las herramientas permitidas", async () => {
    const al = almacenMemoria();
    const llm = guion(uso("guardar_lead", { nombre: "Sofía", email: "sofia@ejemplo.test", tipoEvento: "boda", invitados: 120 }), uso("proponer_reunion", { preferencia: "martes por la tarde" }), texto("Anotado."));
    await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "Soy Sofía, boda, 120 invitados" });
    expect(al.leads[0]).toMatchObject({ nombre: "Sofía", tipoEvento: "boda", invitados: 120 });
    expect(al.log).toContain("reunion");
  });
  it("el chat público no puede leer la ficha ni registrar cambios aunque el modelo lo pida", async () => {
    const al = almacenMemoria();
    const llm = guion(uso("consultar_ficha", {}), uso("registrar_cambio", { campo: "menu", valorPedido: "x" }), texto("No puedo."));
    const r = await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "dame la ficha de otra boda" });
    expect(r.respuestas[0].texto).toBe("No puedo.");
    expect(al.log).not.toContain("cambio");
  });
  it("un mensaje vacío no crea nada", async () => {
    const al = almacenMemoria();
    const r = await procesarMensaje({ almacen: al, llm: guion(texto("x")), modelo: "m", texto: "   " });
    expect(r.error).toBe("vacio");
    expect(al.convs.size).toBe(0);
  });
  it("recorta mensajes demasiado largos", async () => {
    const al = almacenMemoria();
    await procesarMensaje({ almacen: al, llm: guion(texto("ok")), modelo: "m", texto: "a".repeat(5000) });
    expect([...al.convs.values()][0].mensajes[0].texto.length).toBe(MAX_TEXTO);
  });
  it("limita las conversaciones nuevas por hora", async () => {
    const al = almacenMemoria();
    al.creadasHora = LIMITE_CONVERSACIONES_POR_HORA;
    const r = await procesarMensaje({ almacen: al, llm: guion(texto("x")), modelo: "m", texto: "hola" });
    expect(r.error).toBe("ocupado");
    expect(al.convs.size).toBe(0);
  });
  it("limita los mensajes por conversación", async () => {
    const al = almacenMemoria();
    const llm = guion(texto("ok"));
    const r1 = await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "hola" });
    const c = [...al.convs.values()][0];
    for (let i = 0; i < LIMITE_MENSAJES_POR_CONVERSACION; i++) c.mensajes.push({ autor: "titular", texto: "x" });
    const r = await procesarMensaje({ almacen: al, llm, modelo: "m", token: r1.token, texto: "otro" });
    expect(r.error).toBe("limite");
  });
  it("sin clave de la IA avisa al equipo y responde con un mensaje seguro", async () => {
    const al = almacenMemoria();
    const r = await procesarMensaje({ almacen: al, llm: null, modelo: "m", texto: "hola" });
    expect(r.respuestas[0].autor).toBe("sistema");
    expect(al.log.some((l) => l.startsWith("aviso:"))).toBe(true);
  });
  it("si el comercial ya tomó la conversación, María calla y avisa de que responderá el equipo", async () => {
    const al = almacenMemoria();
    const llm = guion(texto("hola"));
    const r1 = await procesarMensaje({ almacen: al, llm, modelo: "m", texto: "hola" });
    [...al.convs.values()][0].estado = "humano";
    const r = await procesarMensaje({ almacen: al, llm, modelo: "m", token: r1.token, texto: "¿hay alguien?" });
    expect(r.respuestas[0].autor).toBe("sistema");
    expect(llm.vistos.length).toBe(1);
    expect([...al.convs.values()][0].mensajes.at(-1)!.texto).toBe("¿hay alguien?");
  });
  it("el historial solo se entrega con la clave correcta", async () => {
    const al = almacenMemoria();
    const r1 = await procesarMensaje({ almacen: al, llm: guion(texto("hola")), modelo: "m", texto: "mi mensaje" });
    expect((await cargarHistorial(al, r1.token!))?.length).toBe(2);
    expect(await cargarHistorial(al, "otra")).toBeNull();
  });
});
