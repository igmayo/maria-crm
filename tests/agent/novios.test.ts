import { describe, it, expect } from "vitest";
import { procesarMensajeNovios, cargarChatNovios, textoEstadoNovios, LIMITE_MENSAJES_POR_HORA, MAX_TEXTO } from "@/lib/novios/servicio";
import type { AlmacenNovios, ContextoNovios, MensajeVisible } from "@/lib/novios/servicio";
import { huella } from "@/lib/chat/token";
import { herramientasPara, ejecutar } from "@/lib/agent/herramientas";
import type { ClienteLLM, RespuestaLLM } from "@/lib/agent";

const TOKEN = "token-de-lucia-con-longitud-suficiente";
function almacen(estado = "maria", mensajesHora = 0) {
  const log: string[] = [];
  const msgs: MensajeVisible[] = [];
  const ctx: ContextoNovios = { conversacionId: "c1", contactoId: "k1", eventoId: "e1", estado, nombre: "Lucía" };
  const a: AlmacenNovios & { log: string[]; msgs: MensajeVisible[] } = {
    log, msgs,
    async porToken(h) { return h === huella(TOKEN) ? ctx : null; },
    async contarMensajesTitularUltimaHora() { return mensajesHora; },
    async guardarMensaje(m) { msgs.push({ id: `m${msgs.length}`, autor: m.autor, texto: m.texto, creadoEn: "", nombre: m.autor === "titular" ? "Lucía" : null, posicion: 1, foto: null }); return "x"; },
    async historial() { return msgs; },
    async estado() { return { cambios: ["Hora del banquete: 22:00"], avisos: [] }; },
    async buscarConocimiento() { return []; },
    async leerFicha() { return { Titulares: "Lucía y Andrés", Menú: "Cóctel" }; },
    async registrarCambio(_c, x) { log.push(`cambio:${x.campo}=${x.valorPedido}`); return { id: "p1" }; },
    async crearPendiente(_c, p) { log.push(`pendiente:${p.tipo}`); return { id: "p2" }; },
    async proponerReunion() { log.push("reunion"); },
    async avisarEquipo(_c, m) { log.push(`aviso:${m}`); },
    async registrarEjecucion() { log.push("ejecucion"); },
  };
  return a;
}
const texto = (t: string): RespuestaLLM => ({ contenido: [{ type: "text", text: t }], parada: "end_turn", tokensEntrada: 1, tokensSalida: 1 });
const guion = (...r: RespuestaLLM[]): ClienteLLM & { vistos: unknown[] } => { let i = 0; const vistos: unknown[] = []; return { vistos, crear: async (p) => { vistos.push(structuredClone(p)); return r[Math.min(i++, r.length - 1)]; } }; };

describe("chat de novios", () => {
  it("María responde, se guardan los dos mensajes y el prompt es del ámbito novios", async () => {
    const al = almacen(); const llm = guion(texto("Hola, Lucía."));
    const r = await procesarMensajeNovios({ almacen: al, llm, modelo: "m", token: TOKEN, texto: "¿A qué hora es el banquete?" });
    expect(r.respuestas).toEqual([{ autor: "maria", texto: "Hola, Lucía." }]);
    expect(al.msgs.map((m) => m.autor)).toEqual(["titular", "maria"]);
    const visto = JSON.stringify(llm.vistos[0]);
    expect(visto).toContain("titular de una boda ya contratada");
    expect(visto).toContain("Hora del banquete: 22:00");
  });
  it("un enlace desconocido no entra", async () => {
    const r = await procesarMensajeNovios({ almacen: almacen(), llm: guion(texto("x")), modelo: "m", token: "otro-token-distinto-largo-abc", texto: "hola" });
    expect(r.error).toBe("enlace");
  });
  it("vacío y demasiado largo", async () => {
    expect((await procesarMensajeNovios({ almacen: almacen(), llm: guion(texto("x")), modelo: "m", token: TOKEN, texto: "  " })).error).toBe("vacio");
    const al = almacen();
    await procesarMensajeNovios({ almacen: al, llm: guion(texto("x")), modelo: "m", token: TOKEN, texto: "a".repeat(MAX_TEXTO + 500) });
    expect(al.msgs[0].texto.length).toBe(MAX_TEXTO);
  });
  it("límite de mensajes por hora", async () => {
    const r = await procesarMensajeNovios({ almacen: almacen("maria", LIMITE_MENSAJES_POR_HORA), llm: guion(texto("x")), modelo: "m", token: TOKEN, texto: "hola" });
    expect(r.error).toBe("limite");
  });
  it("si lleva el equipo, María no contesta y se avisa", async () => {
    for (const estado of ["humano", "cerrada"]) {
      const al = almacen(estado); const llm = guion(texto("no debería"));
      const r = await procesarMensajeNovios({ almacen: al, llm, modelo: "m", token: TOKEN, texto: "¿Podéis llamarme?" });
      expect(llm.vistos.length).toBe(0);
      expect(r.respuestas[0].autor).toBe("sistema");
      expect(al.log.some((l) => l.startsWith("aviso:"))).toBe(true);
      expect(al.msgs.map((m) => m.autor)).toEqual(["titular"]);
    }
  });
  it("sin María disponible avisa al equipo y lo dice", async () => {
    const al = almacen();
    const r = await procesarMensajeNovios({ almacen: al, llm: null, modelo: "m", token: TOKEN, texto: "hola" });
    expect(r.respuestas[0].texto).toContain("avisado a vuestra comercial");
    expect(al.log.some((l) => l.startsWith("aviso:"))).toBe(true);
  });
  it("el historial identifica quién escribe y el estado lista los cambios pendientes", async () => {
    const al = almacen(); const llm = guion(texto("a"), texto("b"));
    await procesarMensajeNovios({ almacen: al, llm, modelo: "m", token: TOKEN, texto: "primero" });
    await procesarMensajeNovios({ almacen: al, llm, modelo: "m", token: TOKEN, texto: "segundo" });
    expect(JSON.stringify(llm.vistos[1])).toContain("Lucía: primero");
    expect(textoEstadoNovios({ cambios: ["a: b"], avisos: [] })).toContain("pendientes de validar");
  });
  it("carga el chat solo con un enlace válido", async () => {
    const al = almacen();
    expect(await cargarChatNovios(al, "no-vale-no-vale-no-vale-123")).toBe(null);
    expect(await cargarChatNovios(al, TOKEN)).toEqual([]);
  });
});

describe("herramientas del ámbito novios", () => {
  const amb = { tipo: "novios" as const, eventoId: "e", conversacionId: "c", contactoId: "k", nombre: "Lucía" };
  it("no tienen guardar_lead y registrar_cambio no modifica la ficha", async () => {
    expect(herramientasPara(amb).map((h) => h.name)).not.toContain("guardar_lead");
    const al = almacen();
    const repo = { buscarConocimiento: al.buscarConocimiento, leerFicha: () => al.leerFicha({} as ContextoNovios), registrarCambio: (c: { campo: string; valorPedido: string }) => al.registrarCambio({} as ContextoNovios, c), crearPendiente: async () => ({ id: "x" }), guardarLead: async () => { throw new Error("no"); }, proponerReunion: async () => ({ id: "x" }), avisarEquipo: async () => {} };
    expect(await ejecutar(amb, repo as never, "guardar_lead", { nombre: "x", tipoEvento: "boda" })).toContain("herramienta_no_permitida");
    expect(await ejecutar(amb, repo as never, "registrar_cambio", { campo: "Menú", valorPedido: "Sin marisco" })).toContain("p1");
    expect(al.log).toContain("cambio:Menú=Sin marisco");
  });
});
