/** Avisos por correo (D40). SOLO servidor: usa la clave de servicio. La cola `avisos` no tiene políticas para usuarios. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarCorreo } from "@/lib/correo";
import { correoHtml, correoTexto, type ContenidoCorreo } from "@/lib/plantilla-correo";
import { caducaEn, enlaceNovios } from "@/lib/acceso";
import { generarToken, huella } from "@/lib/chat/token";
import { avisoNovios, avisoEquipo, recordatorio } from "@/lib/avisos-correo";
import { fechaLarga } from "@/lib/formato";

/** Los avisos a novios esperan unos minutos para juntar varias respuestas en un solo correo. */
export const VENTANA_NOVIOS_MS = 3 * 60_000;
export const PLAZO_4H = 4 * 3600_000;
export const PLAZO_24H = 24 * 3600_000;
/** Un aviso que no se ha podido enviar en dos días se descarta: ya no sirve. */
const CADUCIDAD_AVISO = 48 * 3600_000;

export type Envio = (c: { para: string; asunto: string; texto: string; html: string; responderA?: string }) => Promise<boolean>;

export async function crearAviso(sb: SupabaseClient, a: { tipo: "equipo_te_toca" | "novios_respuesta"; conversacionId: string; contactoId?: string; mensajeId?: string; motivo?: string }): Promise<void> {
  const { error } = await sb.from("avisos").insert({ tipo: a.tipo, conversacion_id: a.conversacionId, contacto_id: a.contactoId ?? null, mensaje_id: a.mensajeId ?? null, motivo: a.motivo ?? null });
  if (error) console.error("crear aviso:", error.message);
}

interface Conv { id: string; estado: string; responsable_id: string | null; evento_id: string }
interface Ficha { fecha: string | null; responsable_id: string | null; contactos: { id: string; nombre: string; email: string | null; posicion: number }[] }

async function cargarBoda(sb: SupabaseClient, eventoId: string): Promise<Ficha | null> {
  const { data: ev } = await sb.from("eventos").select("fecha,responsable_id").eq("id", eventoId).maybeSingle();
  if (!ev) return null;
  const { data: cs } = await sb.from("contactos").select("id,nombre,email,posicion").eq("evento_id", eventoId).order("posicion");
  return { fecha: ev.fecha, responsable_id: ev.responsable_id, contactos: (cs ?? []) as Ficha["contactos"] };
}

const nombresNovios = (f: Ficha) => f.contactos.map((c) => c.nombre).filter((n) => n && n !== "Visitante").join(" y ") || "Una persona";

async function destinatariosEquipo(sb: SupabaseClient, responsableId: string | null, conAdmins: boolean): Promise<{ id: string; nombre: string; email: string; admin: boolean }[]> {
  const ids = new Set<string>();
  const salida: { id: string; nombre: string; email: string; admin: boolean }[] = [];
  const { data: ps } = await sb.from("perfiles").select("id,nombre,email,rol,activo").eq("activo", true);
  for (const p of (ps ?? []) as { id: string; nombre: string; email: string; rol: string }[]) {
    const esResp = p.id === responsableId;
    const esAdmin = p.rol === "administrador";
    if ((esResp || (esAdmin && (conAdmins || !responsableId))) && !ids.has(p.id)) { ids.add(p.id); salida.push({ id: p.id, nombre: p.nombre, email: p.email, admin: esAdmin }); }
  }
  return salida;
}

async function enviarA(envio: Envio, para: string, c: { asunto: string; contenido: ContenidoCorreo }, base: string, responderA?: string): Promise<boolean> {
  return envio({ para, asunto: c.asunto, texto: correoTexto(c.contenido), html: correoHtml(c.contenido, base), responderA });
}

/** Recordatorios: crea los avisos de 4 h y 24 h de las conversaciones que esperan al equipo. El índice único evita duplicados. */
async function generarRecordatorios(sb: SupabaseClient, ahora: number): Promise<void> {
  const { data: cs } = await sb.from("conversaciones").select("id,estado").in("estado", ["te_toca", "sin_asignar"]);
  for (const c of (cs ?? []) as { id: string; estado: string }[]) {
    const { data: t } = await sb.from("mensajes").select("id,creado_en").eq("conversacion_id", c.id).eq("autor", "titular").order("creado_en", { ascending: false }).limit(1).maybeSingle();
    if (!t) continue;
    const { data: e } = await sb.from("mensajes").select("id").eq("conversacion_id", c.id).eq("autor", "equipo").gt("creado_en", t.creado_en).limit(1).maybeSingle();
    if (e) continue;
    const edad = ahora - new Date(t.creado_en).getTime();
    for (const [plazo, tipo] of [[PLAZO_4H, "recordatorio_4h"], [PLAZO_24H, "recordatorio_24h"]] as const) {
      if (edad >= plazo) await sb.from("avisos").insert({ tipo, conversacion_id: c.id, mensaje_id: t.id });
    }
  }
}

export interface Resumen { enviados: number; descartados: number; pendientes: number }

export async function procesarAvisos(sb: SupabaseClient, o: { base: string; envio?: Envio; ahora?: number; recordatorios?: boolean }): Promise<Resumen> {
  const ahora = o.ahora ?? Date.now();
  const envio: Envio = o.envio ?? ((c) => enviarCorreo(c));
  const r: Resumen = { enviados: 0, descartados: 0, pendientes: 0 };
  if (o.recordatorios !== false) await generarRecordatorios(sb, ahora);

  const { data } = await sb.from("avisos").select("id,tipo,conversacion_id,contacto_id,mensaje_id,motivo,creado_en")
    .is("enviado_en", null).is("descartado_en", null).order("creado_en").limit(200);
  const pendientes = (data ?? []) as { id: string; tipo: string; conversacion_id: string; contacto_id: string | null; mensaje_id: string | null; motivo: string | null; creado_en: string }[];
  const marcar = async (ids: string[], campo: "enviado_en" | "descartado_en") => {
    if (!ids.length) return;
    await sb.from("avisos").update({ [campo]: new Date(ahora).toISOString() }).in("id", ids);
    if (campo === "enviado_en") r.enviados += ids.length; else r.descartados += ids.length;
  };

  // Novios: se agrupan por titular.
  const porTitular = new Map<string, typeof pendientes>();
  for (const a of pendientes.filter((x) => x.tipo === "novios_respuesta" && x.contacto_id)) {
    porTitular.set(a.contacto_id!, [...(porTitular.get(a.contacto_id!) ?? []), a]);
  }
  for (const [contactoId, lista] of porTitular) {
    const ids = lista.map((a) => a.id);
    const primero = new Date(lista[0].creado_en).getTime();
    if (ahora - primero > CADUCIDAD_AVISO) { await marcar(ids, "descartado_en"); continue; }
    if (ahora - primero < VENTANA_NOVIOS_MS) { r.pendientes += ids.length; continue; }
    const { data: ct } = await sb.from("contactos").select("nombre,email,evento_id").eq("id", contactoId).maybeSingle();
    if (!ct?.email) { await marcar(ids, "descartado_en"); continue; }
    // Si el titular ha abierto el chat después de la respuesta, ya la ha visto.
    const { data: ac } = await sb.from("accesos").select("ultimo_uso").eq("contacto_id", contactoId).is("revocado_en", null).order("ultimo_uso", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (ac?.ultimo_uso && new Date(ac.ultimo_uso).getTime() > primero) { await marcar(ids, "descartado_en"); continue; }
    const boda = await cargarBoda(sb, ct.evento_id);
    if (!boda?.fecha) { await marcar(ids, "descartado_en"); continue; }
    const caduca = caducaEn(boda.fecha);
    if (caduca.getTime() <= ahora) { await marcar(ids, "descartado_en"); continue; }
    // El enlace no se puede recuperar (solo se guarda su huella): se crea uno nuevo para este correo.
    const token = generarToken();
    const { error } = await sb.from("accesos").insert({ contacto_id: contactoId, token_hash: huella(token), caduca_en: caduca.toISOString(), enviado_en: new Date(ahora).toISOString() });
    if (error) { r.pendientes += ids.length; continue; }
    let persona = null as { nombre: string; frase: string | null; foto: string | null } | null;
    let responderA: string | undefined;
    if (boda.responsable_id) {
      const { data: p } = await sb.from("perfiles").select("nombre,frase,foto_url,email").eq("id", boda.responsable_id).maybeSingle();
      if (p) { persona = { nombre: p.nombre, frase: p.frase, foto: p.foto_url }; responderA = p.email; }
    }
    const c = avisoNovios(ct.nombre, persona, ids.length, enlaceNovios(o.base, token));
    if (await enviarA(envio, ct.email, c, o.base, responderA)) await marcar(ids, "enviado_en"); else r.pendientes += ids.length;
  }

  // Equipo y recordatorios: uno por aviso.
  for (const a of pendientes.filter((x) => x.tipo !== "novios_respuesta")) {
    if (new Date(ahora).getTime() - new Date(a.creado_en).getTime() > CADUCIDAD_AVISO) { await marcar([a.id], "descartado_en"); continue; }
    const { data: cv } = await sb.from("conversaciones").select("id,estado,responsable_id,evento_id").eq("id", a.conversacion_id).maybeSingle();
    const conv = cv as Conv | null;
    if (!conv || !["te_toca", "sin_asignar"].includes(conv.estado)) { await marcar([a.id], "descartado_en"); continue; }
    if (a.tipo !== "equipo_te_toca" && a.mensaje_id) {
      // Si ya contestó el equipo después de ese mensaje, el recordatorio sobra.
      const { data: t } = await sb.from("mensajes").select("creado_en").eq("id", a.mensaje_id).maybeSingle();
      const { data: e } = t ? await sb.from("mensajes").select("id").eq("conversacion_id", conv.id).eq("autor", "equipo").gt("creado_en", t.creado_en).limit(1).maybeSingle() : { data: null };
      if (e) { await marcar([a.id], "descartado_en"); continue; }
    }
    const boda = await cargarBoda(sb, conv.evento_id);
    if (!boda) { await marcar([a.id], "descartado_en"); continue; }
    const responsableId = conv.responsable_id ?? boda.responsable_id;
    const destinos = await destinatariosEquipo(sb, responsableId, a.tipo === "recordatorio_24h");
    if (destinos.length === 0) { await marcar([a.id], "descartado_en"); continue; }
    const enlace = `${o.base}/equipo/c/${conv.id}`;
    const novios = nombresNovios(boda);
    const responsable = destinos.find((d) => d.id === responsableId)?.nombre ?? null;
    let todos = true;
    for (const d of destinos) {
      const c = a.tipo === "equipo_te_toca"
        ? avisoEquipo(d.nombre, novios, a.motivo, enlace, boda.fecha ? fechaLarga(boda.fecha).toLowerCase() : null)
        : recordatorio(a.tipo === "recordatorio_4h" ? 4 : 24, d.nombre, novios, responsable, enlace, d.admin);
      if (!(await enviarA(envio, d.email, c, o.base))) todos = false;
    }
    if (todos) await marcar([a.id], "enviado_en"); else r.pendientes += 1;
  }
  return r;
}
