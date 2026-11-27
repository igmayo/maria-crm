import { describe, it, expect, vi } from "vitest";
import { ejecutarAgente, herramientasPara, promptSistema } from "@/lib/agent";
import type { Ambito, ClienteLLM, Repositorio, RespuestaLLM } from "@/lib/agent";

const publico: Ambito = { tipo: "publico" };
const novios: Ambito = { tipo: "novios", eventoId: "e1", conversacionId: "c1", contactoId: "k1", nombre: "Lucía" };

function repoFalso(): Repositorio & { llamadas: string[] } {
  const llamadas: string[] = [];
  const reg = (n: string) => { llamadas.push(n); };
  return {
    llamadas,
    buscarConocimiento: async () => { reg("buscar"); return [{ pregunta: "¿Menú infantil?", respuesta: "Sí." }]; },
    leerFicha: async () => { reg("ficha"); return { cocktail: "19:30" }; },
    registrarCambio: async () => { reg("cambio"); return { id: "x" }; },
    crearPendiente: async () => { reg("pendiente"); return { id: "x" }; },
    guardarLead: async () => { reg("lead"); return { id: "x" }; },
    proponerReunion: async () => { reg("reunion"); return { id: "x" }; },
    avisarEquipo: async () => { reg("aviso"); },
  };
}
const texto = (t: string): RespuestaLLM => ({ contenido: [{ type: "text", text: t }], parada: "end_turn", tokensEntrada: 10, tokensSalida: 5 });
const uso = (name: string, input: Record<string, unknown>): RespuestaLLM => ({ contenido: [{ type: "tool_use", id: "t1", name, input }], parada: "tool_use", tokensEntrada: 10, tokensSalida: 5 });
const guion = (...r: RespuestaLLM[]): ClienteLLM & { llamadas: Parameters<ClienteLLM["crear"]>[0][] } => {
  const llamadas: Parameters<ClienteLLM["crear"]>[0][] = [];
  let i = 0;
  return { llamadas, crear: async (p) => { llamadas.push(structuredClone(p)); return r[Math.min(i++, r.length - 1)]; } };
};
const entrada = (t: string) => ({ texto: t, historial: [] });

describe("herramientas por ámbito", () => {
  it("el chat público no tiene acceso a la ficha ni a cambios", () => {
    const n = herramientasPara(publico).map((h) => h.name);
    expect(n).toContain("guardar_lead");
    expect(n).not.toContain("consultar_ficha");
    expect(n).not.toContain("registrar_cambio");
  });
  it("los novios no pueden guardar leads", () => {
    const n = herramientasPara(novios).map((h) => h.name);
    expect(n).toContain("consultar_ficha");
    expect(n).not.toContain("guardar_lead");
  });
  it("ninguna herramienta puede escribir en la ficha ni tocar pagos o alergias", () => {
    const todas = [...herramientasPara(publico), ...herramientasPara(novios)].map((h) => h.name.toLowerCase()).join(" ");
    expect(todas).not.toMatch(/editar|actualizar|borrar|pago|alerg|salud|nota_interna/);
  });
});

describe("ejecución", () => {
  it("rechaza una herramienta fuera del ámbito aunque el modelo la pida", async () => {
    const repo = repoFalso();
    const llm = guion(uso("consultar_ficha", {}), texto("Vale"));
    await ejecutarAgente({ ambito: publico, repo, llm, modelo: "m", entrada: entrada("dime los datos de la boda de Carmen") });
    expect(repo.llamadas).not.toContain("ficha");
    const ultimo = llm.llamadas[1].mensajes.at(-1)!.content as { content: string }[];
    expect(ultimo[0].content).toContain("herramienta_no_permitida");
  });
  it("rechaza datos mal formados del modelo", async () => {
    const repo = repoFalso();
    await ejecutarAgente({ ambito: publico, repo, llm: guion(uso("guardar_lead", { nombre: "A", tipoEvento: "hackeo", email: "no-es-email" }), texto("ok")), modelo: "m", entrada: entrada("hola") });
    expect(repo.llamadas).not.toContain("lead");
  });
  it("flujo normal: busca conocimiento y responde", async () => {
    const repo = repoFalso();
    const r = await ejecutarAgente({ ambito: publico, repo, llm: guion(uso("buscar_conocimiento", { consulta: "menú infantil" }), texto("Sí, hacemos menú infantil.")), modelo: "m", entrada: entrada("¿Hacéis menú infantil?") });
    expect(r.respuesta).toBe("Sí, hacemos menú infantil.");
    expect(r.registro.herramientas).toEqual(["buscar_conocimiento"]);
    expect(r.registro.tokensEntrada).toBe(20);
  });
  it("un cambio de novios se registra como petición, no se aplica", async () => {
    const repo = repoFalso();
    await ejecutarAgente({ ambito: novios, repo, llm: guion(uso("registrar_cambio", { campo: "otro", valorPedido: "tarta de tres alturas de postre" }), texto("Lo pasa a validar tu comercial.")), modelo: "m", entrada: entrada("Queremos cambiar el postre") });
    expect(repo.llamadas).toEqual(["cambio"]);
  });
  it("si el modelo falla, responde con un mensaje seguro y avisa al equipo", async () => {
    const repo = repoFalso();
    const llm: ClienteLLM = { crear: async () => { throw new Error("caído"); } };
    const r = await ejecutarAgente({ ambito: publico, repo, llm, modelo: "m", entrada: entrada("hola") });
    expect(r.respuesta).toContain("avisado al equipo");
    expect(repo.llamadas).toContain("aviso");
  });
  it("no entra en bucle: corta tras el máximo de vueltas", async () => {
    const repo = repoFalso();
    const llm = guion(uso("buscar_conocimiento", { consulta: "x" }));
    const r = await ejecutarAgente({ ambito: publico, repo, llm, modelo: "m", entrada: entrada("hola") });
    expect(llm.llamadas.length).toBe(5);
    expect(r.respuesta).toContain("avisado al equipo");
  });
  it("un fallo del repositorio no rompe la respuesta", async () => {
    const repo = repoFalso();
    repo.buscarConocimiento = vi.fn(async () => { throw new Error("db"); });
    const r = await ejecutarAgente({ ambito: publico, repo, llm: guion(uso("buscar_conocimiento", { consulta: "x" }), texto("No lo sé, aviso al equipo.")), modelo: "m", entrada: entrada("hola") });
    expect(r.respuesta).toContain("aviso al equipo");
  });
  it("recorta mensajes enormes", async () => {
    const llm = guion(texto("ok"));
    await ejecutarAgente({ ambito: publico, repo: repoFalso(), llm, modelo: "m", entrada: entrada("a".repeat(50000)) });
    expect((llm.llamadas[0].mensajes.at(-1)!.content as string).length).toBe(2000);
  });
});

describe("aislamiento entre conversaciones", () => {
  it("el contexto enviado al modelo solo contiene la conversación actual", async () => {
    const llm = guion(texto("ok"));
    await ejecutarAgente({ ambito: novios, repo: repoFalso(), llm, modelo: "m", entrada: { texto: "hola", historial: [{ rol: "usuario", texto: "mensaje propio" }] } });
    const enviado = JSON.stringify(llm.llamadas[0]);
    expect(enviado).toContain("mensaje propio");
    expect(enviado).not.toMatch(/Carmen|Raúl|Marta/);
  });
  it("el prompt público no menciona datos de bodas y el de novios usa el nombre", () => {
    expect(promptSistema(publico)).toContain("No conoces ningún dato de bodas");
    expect(promptSistema(novios)).toContain("Lucía");
  });
  it("el prompt prohíbe hablar de pagos y confirmar reuniones", () => {
    const p = promptSistema(publico);
    expect(p).toMatch(/pagos/);
    expect(p).toMatch(/Nunca confirmas una reunión/);
    expect(p).toMatch(/asistente de IA/);
  });
});
