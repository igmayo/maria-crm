import { clienteServidor } from "@/lib/supabase/servidor";
import { agruparPreguntas, type EstadoConocimiento, type PreguntaSinResponder } from "@/lib/conocimiento";

export interface RespuestaConocimiento {
  id: string; categoria: string; pregunta: string; respuesta: string; estado: EstadoConocimiento; version: number;
  nota: string | null; autor: string | null; autorId: string | null; actualizadoEn: string;
}

const COLUMNAS = "id,categoria,pregunta,respuesta,estado,version,nota_revision,autor_id,actualizado_en,autor:perfiles!conocimiento_autor_id_fkey(nombre)";

function mapear(f: unknown): RespuestaConocimiento {
  const r = f as { id: string; categoria: string; pregunta: string; respuesta: string; estado: EstadoConocimiento; version: number; nota_revision: string | null; autor_id: string | null; actualizado_en: string; autor: { nombre: string } | null };
  return { id: r.id, categoria: r.categoria, pregunta: r.pregunta, respuesta: r.respuesta, estado: r.estado, version: r.version, nota: r.nota_revision, autor: r.autor?.nombre ?? null, autorId: r.autor_id, actualizadoEn: r.actualizado_en };
}

/** Siempre con la sesión de la persona: las reglas de la base de datos deciden qué ve cada una. */
export async function listarConocimiento(): Promise<RespuestaConocimiento[]> {
  const sb = await clienteServidor();
  const { data, error } = await sb.from("conocimiento").select(COLUMNAS).order("actualizado_en", { ascending: false }).limit(500);
  if (error) console.error("conocimiento:", error.message);
  return (data ?? []).map(mapear);
}

export async function cargarRespuesta(id: string): Promise<RespuestaConocimiento | null> {
  const sb = await clienteServidor();
  const { data } = await sb.from("conocimiento").select(COLUMNAS).eq("id", id).maybeSingle();
  return data ? mapear(data) : null;
}

export async function listarSinRespuesta(): Promise<PreguntaSinResponder[]> {
  const sb = await clienteServidor();
  const { data, error } = await sb.from("pendientes").select("id,descripcion,creado_en,conversacion_id")
    .eq("tipo", "pregunta_maria").is("ensenado_en", null).is("resuelto_en", null).order("creado_en", { ascending: false }).limit(300);
  if (error) console.error("sin respuesta:", error.message);
  return agruparPreguntas((data ?? []) as { id: string; descripcion: string | null; creado_en: string; conversacion_id: string }[]);
}

export async function preguntasDeConversacion(conversacionId: string): Promise<{ id: string; texto: string }[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from("pendientes").select("id,descripcion,creado_en,conversacion_id")
    .eq("conversacion_id", conversacionId).eq("tipo", "pregunta_maria").is("ensenado_en", null).is("resuelto_en", null).order("creado_en", { ascending: false }).limit(10);
  return agruparPreguntas((data ?? []) as { id: string; descripcion: string | null; creado_en: string; conversacion_id: string }[]).map((g) => ({ id: g.ids[0], texto: g.texto }));
}
