/** Enlaces personales de los novios. SOLO servidor: usa la clave de servicio porque la tabla accesos no tiene políticas para usuarios.
 *  Quien llama debe haber comprobado antes que la persona puede gestionar esa boda (es_responsable_evento). */
import { clienteAdmin } from "@/lib/supabase/admin";
import { generarToken, huella } from "@/lib/chat/token";

export interface EstadoEnlace { activo: boolean; ultimoUso: string | null; enviadoEn: string | null }

/** Un titular puede tener varios enlaces válidos a la vez (cada "copiar" o "enviar" crea uno nuevo, el anterior sigue funcionando). */
export async function estadoEnlaces(contactoIds: string[]): Promise<Record<string, EstadoEnlace>> {
  const salida: Record<string, EstadoEnlace> = Object.fromEntries(contactoIds.map((id) => [id, { activo: false, ultimoUso: null, enviadoEn: null }]));
  if (contactoIds.length === 0) return salida;
  const { data, error } = await clienteAdmin().from("accesos").select("contacto_id,caduca_en,revocado_en,ultimo_uso,enviado_en").in("contacto_id", contactoIds);
  if (error) { console.error("accesos:", error.message); return salida; }
  const ahora = Date.now();
  for (const a of (data ?? []) as { contacto_id: string; caduca_en: string; revocado_en: string | null; ultimo_uso: string | null; enviado_en: string | null }[]) {
    const e = salida[a.contacto_id];
    if (!a.revocado_en && new Date(a.caduca_en).getTime() > ahora) e.activo = true;
    if (a.ultimo_uso && (!e.ultimoUso || a.ultimo_uso > e.ultimoUso)) e.ultimoUso = a.ultimo_uso;
    if (a.enviado_en && (!e.enviadoEn || a.enviado_en > e.enviadoEn)) e.enviadoEn = a.enviado_en;
  }
  return salida;
}

/** Crea un enlace nuevo y devuelve el token (solo se guarda su huella: no se puede volver a ver). */
export async function crearEnlace(contactoId: string, caduca: Date, enviado: boolean): Promise<string | null> {
  const token = generarToken();
  const { error } = await clienteAdmin().from("accesos").insert({
    contacto_id: contactoId, token_hash: huella(token), caduca_en: caduca.toISOString(), enviado_en: enviado ? new Date().toISOString() : null,
  });
  if (error) { console.error("crear enlace:", error.message); return null; }
  return token;
}

export async function marcarEnviado(token: string): Promise<void> {
  await clienteAdmin().from("accesos").update({ enviado_en: new Date().toISOString() }).eq("token_hash", huella(token));
}

/** Anula todos los enlaces vigentes del titular. No borra nada. */
export async function anularEnlaces(contactoId: string): Promise<boolean> {
  const { error } = await clienteAdmin().from("accesos").update({ revocado_en: new Date().toISOString() }).eq("contacto_id", contactoId).is("revocado_en", null);
  if (error) console.error("anular enlaces:", error.message);
  return !error;
}

export interface PortalBoda {
  titular: { nombre: string; posicion: number };
  titulares: { nombre: string; posicion: number }[];
  comercial: string | null;
  evento: {
    fecha: string | null; lugar: string | null; tipo_ceremonia: string | null; hora_ceremonia: string | null; hora_banquete: string | null;
    adultos: number | null; ninos: number | null; invitados: number | null; menu: string | null;
  };
}

/** Valida el enlace y devuelve lo que los novios pueden ver. Columnas elegidas una a una: NUNCA dato_interes, estado, origen ni notas internas. */
export async function cargarPortal(token: string): Promise<PortalBoda | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const sb = clienteAdmin();
  const { data: a } = await sb.from("accesos").select("id,contacto_id,caduca_en,revocado_en").eq("token_hash", huella(token)).maybeSingle();
  if (!a || a.revocado_en || new Date(a.caduca_en).getTime() <= Date.now()) return null;
  const { data: c } = await sb.from("contactos").select("evento_id,nombre,posicion").eq("id", a.contacto_id).maybeSingle();
  if (!c) return null;
  const { data: ev } = await sb.from("eventos")
    .select("fecha,lugar,tipo_ceremonia,hora_ceremonia,hora_banquete,adultos,ninos,invitados,menu,responsable_id").eq("id", c.evento_id).maybeSingle();
  if (!ev) return null;
  const { data: tit } = await sb.from("contactos").select("nombre,posicion").eq("evento_id", c.evento_id).order("posicion");
  let comercial: string | null = null;
  if (ev.responsable_id) {
    const { data: p } = await sb.from("perfiles").select("nombre").eq("id", ev.responsable_id).maybeSingle();
    comercial = p?.nombre ?? null;
  }
  await sb.from("accesos").update({ ultimo_uso: new Date().toISOString() }).eq("id", a.id);
  const { responsable_id: _r, ...evento } = ev;
  return { titular: { nombre: c.nombre, posicion: c.posicion }, titulares: (tit ?? []) as { nombre: string; posicion: number }[], comercial, evento };
}
