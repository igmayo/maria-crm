import { ejecutarAgente } from "@/lib/agent";
import type { ClienteLLM, Registro, Repositorio } from "@/lib/agent";
import { huella } from "@/lib/chat/token";

export const MAX_TEXTO = 1000;
export const LIMITE_MENSAJES_POR_HORA = 40;
const HISTORIAL = 20;

export interface ContextoNovios { conversacionId: string; contactoId: string; eventoId: string; estado: string; nombre: string }
export interface MensajeVisible { id: string; autor: "titular" | "maria" | "equipo"; texto: string; creadoEn: string; nombre: string | null; posicion: number | null; foto: string | null }
export interface EstadoNovios { cambios: string[]; avisos: string[] }

export interface AlmacenNovios {
  porToken(tokenHash: string): Promise<ContextoNovios | null>;
  contarMensajesTitularUltimaHora(conversacionId: string): Promise<number>;
  guardarMensaje(m: { conversacionId: string; autor: "titular" | "maria"; contactoId?: string; texto: string }): Promise<string>;
  historial(conversacionId: string, limite: number): Promise<MensajeVisible[]>;
  estado(ctx: ContextoNovios): Promise<EstadoNovios>;
  buscarConocimiento(consulta: string): Promise<{ pregunta: string; respuesta: string }[]>;
  leerFicha(ctx: ContextoNovios): Promise<Record<string, string>>;
  registrarCambio(ctx: ContextoNovios, c: { campo: string; valorPedido: string }): Promise<{ id: string }>;
  crearPendiente(ctx: ContextoNovios, p: { tipo: "pregunta_maria" | "audio_foto" | "nota"; descripcion: string }): Promise<{ id: string }>;
  proponerReunion(ctx: ContextoNovios, preferencia: string): Promise<void>;
  /** Pasa la conversación a "Te toca" y deja el aviso al equipo (D40). */
  avisarEquipo(ctx: ContextoNovios, motivo: string): Promise<void>;
  registrarEjecucion(ctx: ContextoNovios, r: Registro): Promise<void>;
}

export type ErrorNovios = "vacio" | "enlace" | "limite";
export interface ResultadoNovios { respuestas: { autor: "maria" | "sistema"; texto: string }[]; error?: ErrorNovios }

const TEXTO_EQUIPO = "Vuestra comercial ya tiene vuestro mensaje. Os avisaremos por correo cuando responda.";
const TEXTO_NO_DISPONIBLE = "Ahora mismo no puedo responderos. He avisado a vuestra comercial y os avisaremos por correo cuando responda.";

function repositorio(a: AlmacenNovios, ctx: ContextoNovios): Repositorio {
  const no = async (): Promise<never> => { throw new Error("no disponible para novios"); };
  return {
    buscarConocimiento: (c) => a.buscarConocimiento(c),
    leerFicha: () => a.leerFicha(ctx),
    registrarCambio: (c) => a.registrarCambio(ctx, c),
    crearPendiente: (p) => a.crearPendiente(ctx, p),
    proponerReunion: async (r) => { await a.proponerReunion(ctx, r.preferencia); return { id: ctx.eventoId }; },
    avisarEquipo: (x) => a.avisarEquipo(ctx, x.motivo),
    guardarLead: no,
  };
}

export function textoEstadoNovios(e: EstadoNovios): string {
  return [
    e.cambios.length ? `- Cambios ya registrados, pendientes de validar la comercial: ${e.cambios.join("; ")}` : "- Cambios pendientes: ninguno.",
    e.avisos.length ? `- Avisos ya enviados al equipo: ${e.avisos.join("; ")}` : "- Avisos al equipo: ninguno.",
  ].join("\n");
}

const conNombre = (m: MensajeVisible) => (m.autor === "titular" ? `${m.nombre ?? "Titular"}: ${m.texto}` : m.autor === "equipo" ? `Equipo (${m.nombre ?? "comercial"}): ${m.texto}` : m.texto);

export async function procesarMensajeNovios(args: { almacen: AlmacenNovios; llm: ClienteLLM | null; modelo: string; token: string; texto: string }): Promise<ResultadoNovios> {
  const { almacen, llm, modelo } = args;
  const texto = args.texto.trim().slice(0, MAX_TEXTO);
  if (!texto) return { respuestas: [], error: "vacio" };
  const ctx = await almacen.porToken(huella(args.token));
  if (!ctx) return { respuestas: [], error: "enlace" };
  const [enviados, previo] = await Promise.all([almacen.contarMensajesTitularUltimaHora(ctx.conversacionId), almacen.historial(ctx.conversacionId, HISTORIAL)]);
  if (enviados >= LIMITE_MENSAJES_POR_HORA) return { respuestas: [], error: "limite" };
  const guardado = almacen.guardarMensaje({ conversacionId: ctx.conversacionId, autor: "titular", contactoId: ctx.contactoId, texto });

  // Si el equipo ya lleva la conversación (o está cerrada), María no contesta: le toca a una persona.
  if (ctx.estado === "humano" || ctx.estado === "cerrada") {
    await guardado;
    await almacen.avisarEquipo(ctx, "Han escrito en una conversación que lleva el equipo");
    return { respuestas: [{ autor: "sistema", texto: TEXTO_EQUIPO }] };
  }
  if (!llm) {
    await guardado;
    await almacen.avisarEquipo(ctx, "María no estaba disponible cuando escribieron los novios");
    return { respuestas: [{ autor: "sistema", texto: TEXTO_NO_DISPONIBLE }] };
  }
  const [, estadoConv] = await Promise.all([guardado, almacen.estado(ctx)]);
  const r = await ejecutarAgente({
    ambito: { tipo: "novios", eventoId: ctx.eventoId, conversacionId: ctx.conversacionId, contactoId: ctx.contactoId, nombre: ctx.nombre },
    repo: repositorio(almacen, ctx), llm, modelo, estado: textoEstadoNovios(estadoConv),
    entrada: { texto, historial: previo.map((m) => ({ rol: m.autor === "titular" ? "usuario" : "asistente", texto: conNombre(m) })) },
  });
  await almacen.guardarMensaje({ conversacionId: ctx.conversacionId, autor: "maria", texto: r.respuesta });
  await almacen.registrarEjecucion(ctx, r.registro);
  return { respuestas: [{ autor: "maria", texto: r.respuesta }] };
}

export async function cargarChatNovios(almacen: AlmacenNovios, token: string): Promise<MensajeVisible[] | null> {
  const ctx = await almacen.porToken(huella(token));
  return ctx ? almacen.historial(ctx.conversacionId, 100) : null;
}
