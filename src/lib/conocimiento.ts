/** Enseñar a María (D47). Reglas compartidas entre el formulario, las acciones del servidor y las pruebas. */

export const CATEGORIAS = ["Espacios", "Menús", "Proceso y reuniones", "Dietas", "Otros"] as const;
export const MAX_PREGUNTA = 300;
export const MAX_RESPUESTA = 1500;
export const MAX_CATEGORIA = 60;
export const MAX_NOTA = 500;

export type EstadoConocimiento = "borrador" | "propuesta" | "publicada";
export const ETIQUETA_ESTADO: Record<EstadoConocimiento, [string, string]> = {
  publicada: ["Publicada", "g"], propuesta: ["Por revisar", "p"], borrador: ["Borrador", "gr"],
};

export type ResultadoValidacion = { ok: true; valor: { pregunta: string; respuesta: string; categoria: string } } | { ok: false; error: "pregunta" | "respuesta" | "categoria" };

export function validarRespuesta(entrada: { pregunta: string; respuesta: string; categoria: string }): ResultadoValidacion {
  const pregunta = entrada.pregunta.replace(/\s+/g, " ").trim();
  const respuesta = entrada.respuesta.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const categoria = entrada.categoria.replace(/\s+/g, " ").trim();
  if (pregunta.length < 3 || pregunta.length > MAX_PREGUNTA) return { ok: false, error: "pregunta" };
  if (respuesta.length < 3 || respuesta.length > MAX_RESPUESTA) return { ok: false, error: "respuesta" };
  if (categoria.length < 1 || categoria.length > MAX_CATEGORIA) return { ok: false, error: "categoria" };
  return { ok: true, valor: { pregunta, respuesta, categoria } };
}

/** Avisos al equipo que no son preguntas de clientes (fallos, reuniones, cambios...): no entran en "Sin respuesta". */
const NO_SON_PREGUNTAS = [/^María no /i, /^Han (escrito|vuelto)/i, /^Reunión pedida/i, /pide (un )?cambio/i, /^Cambio /i];
export function esPreguntaSinResponder(descripcion: string | null): boolean {
  const d = (descripcion ?? "").trim();
  return d.length >= 3 && !NO_SON_PREGUNTAS.some((r) => r.test(d));
}

export interface PreguntaSinResponder { clave: string; texto: string; veces: number; ultima: string; ids: string[]; conversacionId: string }

/** Junta las preguntas iguales (sin mirar mayúsculas ni acentos) y las ordena por las que más se repiten. */
export function agruparPreguntas(filas: { id: string; descripcion: string | null; creado_en: string; conversacion_id: string }[]): PreguntaSinResponder[] {
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
  const grupos = new Map<string, PreguntaSinResponder>();
  for (const f of filas) {
    if (!esPreguntaSinResponder(f.descripcion)) continue;
    const texto = (f.descripcion ?? "").trim();
    const clave = norm(texto);
    const g = grupos.get(clave);
    if (!g) grupos.set(clave, { clave, texto, veces: 1, ultima: f.creado_en, ids: [f.id], conversacionId: f.conversacion_id });
    else { g.veces++; g.ids.push(f.id); if (f.creado_en > g.ultima) { g.ultima = f.creado_en; g.conversacionId = f.conversacion_id; } }
  }
  return [...grupos.values()].sort((a, b) => b.veces - a.veces || (a.ultima < b.ultima ? 1 : -1));
}

export const esUuid = (t: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
export const puedeEnsenar = (rol: string) => rol === "administrador" || rol === "comercial";
