import { ejecutarAgente } from "@/lib/agent";
import type { ClienteLLM, Registro, Repositorio } from "@/lib/agent";
import { generarToken, huella } from "./token";

export const LIMITE_CONVERSACIONES_POR_HORA = 30;
export const LIMITE_MENSAJES_POR_CONVERSACION = 60;
export const MAX_TEXTO = 1000;
const HISTORIAL = 20;

export interface Contexto { conversacionId: string; contactoId: string; eventoId: string; estado: string }
export interface Lead { nombre: string; email?: string; telefono?: string; tipoEvento: "boda" | "empresa" | "otro"; fecha?: string; invitados?: number; notas?: string }

/** Todo lo que el chat público necesita de la base de datos. */
export interface EstadoConv { lead: string | null; reunion: string | null; avisos: string[] }

export interface Almacen {
  estado(ctx: Contexto): Promise<EstadoConv>;
  contarCreadasUltimaHora(): Promise<number>;
  crear(tokenHash: string): Promise<Contexto>;
  porToken(tokenHash: string): Promise<Contexto | null>;
  contarMensajesTitular(conversacionId: string): Promise<number>;
  guardarMensaje(m: { conversacionId: string; autor: "titular" | "maria"; contactoId?: string; texto: string }): Promise<void>;
  historial(conversacionId: string, limite: number): Promise<{ autor: string; texto: string }[]>;
  buscarConocimiento(consulta: string): Promise<{ pregunta: string; respuesta: string }[]>;
  guardarLead(ctx: Contexto, lead: Lead): Promise<void>;
  proponerReunion(ctx: Contexto, preferencia: string): Promise<void>;
  avisarEquipo(ctx: Contexto, motivo: string): Promise<void>;
  /** Alguien escribe en una conversación que ya lleva el equipo (o cerrada): vuelve a "Te toca" y se avisa por correo (D40). */
  esperaPersona(ctx: Contexto): Promise<void>;
  registrarEjecucion(ctx: Contexto, r: Registro): Promise<void>;
}

export type ErrorChat = "vacio" | "ocupado" | "limite";
export interface Resultado { token?: string; respuestas: { autor: "maria" | "sistema"; texto: string }[]; error?: ErrorChat }

const TEXTO_NO_DISPONIBLE = "Ahora mismo no puedo responderte. He avisado al equipo y te escribirán en horario de oficina.";
const TEXTO_EQUIPO = "Tu mensaje ya está con el equipo. Te responderán en horario de oficina.";

function repositorio(almacen: Almacen, ctx: Contexto): Repositorio {
  const no = async (): Promise<never> => { throw new Error("no disponible en el chat público"); };
  return {
    buscarConocimiento: (c) => almacen.buscarConocimiento(c),
    guardarLead: async (l) => { await almacen.guardarLead(ctx, l); return { id: ctx.contactoId }; },
    proponerReunion: async (r) => { await almacen.proponerReunion(ctx, r.preferencia); return { id: ctx.eventoId }; },
    avisarEquipo: (a) => almacen.avisarEquipo(ctx, a.motivo),
    leerFicha: no, registrarCambio: no, crearPendiente: no,
  };
}

export function textoEstado(e: EstadoConv): string {
  return [
    e.lead ? `- Datos de contacto ya guardados: ${e.lead}` : "- Datos de contacto: todavía no guardados.",
    e.reunion ? `- Reunión ya registrada, pendiente de confirmar el comercial: ${e.reunion}` : "- Reunión: todavía no registrada.",
    e.avisos.length ? `- Avisos ya enviados al equipo: ${e.avisos.join("; ")}` : "- Avisos al equipo: ninguno.",
  ].join("\n");
}

export async function procesarMensaje(args: {
  almacen: Almacen; llm: ClienteLLM | null; modelo: string; token?: string; texto: string;
}): Promise<Resultado> {
  const { almacen, llm, modelo } = args;
  const texto = args.texto.trim().slice(0, MAX_TEXTO);
  if (!texto) return { respuestas: [], error: "vacio" };

  let token = args.token;
  let ctx = token ? await almacen.porToken(huella(token)) : null;
  if (!ctx) {
    if ((await almacen.contarCreadasUltimaHora()) >= LIMITE_CONVERSACIONES_POR_HORA) return { respuestas: [], error: "ocupado" };
    token = generarToken();
    ctx = await almacen.crear(huella(token));
  }
  const [enviados, previo] = await Promise.all([almacen.contarMensajesTitular(ctx.conversacionId), almacen.historial(ctx.conversacionId, HISTORIAL)]);
  if (enviados >= LIMITE_MENSAJES_POR_CONVERSACION) return { token, respuestas: [], error: "limite" };
  const guardado = almacen.guardarMensaje({ conversacionId: ctx.conversacionId, autor: "titular", contactoId: ctx.contactoId, texto });

  if (ctx.estado === "humano" || ctx.estado === "cerrada") {
    await guardado;
    await almacen.esperaPersona(ctx);
    return { token, respuestas: [{ autor: "sistema", texto: TEXTO_EQUIPO }] };
  }

  if (!llm) {
    await guardado;
    await almacen.avisarEquipo(ctx, "María no estaba disponible cuando escribió esta persona");
    return { token, respuestas: [{ autor: "sistema", texto: TEXTO_NO_DISPONIBLE }] };
  }

  const [, estadoConv] = await Promise.all([guardado, almacen.estado(ctx)]);
  const r = await ejecutarAgente({
    ambito: { tipo: "publico" }, repo: repositorio(almacen, ctx), llm, modelo, estado: textoEstado(estadoConv),
    entrada: { texto, historial: previo.map((m) => ({ rol: m.autor === "titular" ? "usuario" : "asistente", texto: m.texto })) },
  });
  await almacen.guardarMensaje({ conversacionId: ctx.conversacionId, autor: "maria", texto: r.respuesta });
  await almacen.registrarEjecucion(ctx, r.registro);
  return { token, respuestas: [{ autor: "maria", texto: r.respuesta }] };
}

export async function cargarHistorial(almacen: Almacen, token: string): Promise<{ autor: string; texto: string }[] | null> {
  const ctx = await almacen.porToken(huella(token));
  if (!ctx) return null;
  return almacen.historial(ctx.conversacionId, 100);
}
