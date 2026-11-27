import { clienteServidor } from "@/lib/supabase/servidor";
import { sinAcentos } from "@/lib/formato";

export type Filtro = "todas" | "te_toca" | "mias" | "sin_asignar";

export interface ItemBandeja {
  id: string; titulares: string; estado: string; responsable: string | null; esMia: boolean;
  ultimoTexto: string; ultimaActividad: string;
}

interface Contacto { id?: string; nombre: string; posicion: number; email?: string | null; telefono?: string | null }

export function nombreTitulares(c: Contacto[]): string {
  return [...c].sort((a, b) => a.posicion - b.posicion).map((x) => x.nombre).join(" y ") || "Sin nombre";
}

export async function listarBandeja(filtro: Filtro, q: string, miId: string): Promise<{ items: ItemBandeja[]; fallo: boolean }> {
  const sb = await clienteServidor();
  const { data: convs, error } = await sb
    .from("conversaciones")
    .select("id,estado,responsable_id,ultima_actividad,evento:eventos(tipo,contactos(nombre,posicion)),responsable:perfiles!conversaciones_responsable_id_fkey(nombre)")
    .order("ultima_actividad", { ascending: false })
    .limit(100);
  if (error) { console.error("bandeja:", error.message); return { items: [], fallo: true }; }
  const lista = (convs ?? []) as unknown as {
    id: string; estado: string; responsable_id: string | null; ultima_actividad: string;
    evento: { contactos: Contacto[] } | null; responsable: { nombre: string } | null;
  }[];
  if (lista.length === 0) return { items: [], fallo: false };
  const { data: msgs } = await sb
    .from("mensajes").select("conversacion_id,autor,texto,creado_en")
    .in("conversacion_id", lista.map((c) => c.id)).order("creado_en", { ascending: false }).limit(400);
  const ultimo = new Map<string, string>();
  for (const m of (msgs ?? []) as { conversacion_id: string; autor: string; texto: string | null }[]) {
    if (!ultimo.has(m.conversacion_id) && m.autor !== "nota_interna") ultimo.set(m.conversacion_id, m.texto ?? "");
  }
  let items: ItemBandeja[] = lista.map((c) => ({
    id: c.id, titulares: nombreTitulares(c.evento?.contactos ?? []), estado: c.estado,
    responsable: c.responsable?.nombre ?? null, esMia: c.responsable_id === miId,
    ultimoTexto: ultimo.get(c.id) ?? "Sin mensajes todavía", ultimaActividad: c.ultima_actividad,
  }));
  if (filtro === "te_toca") items = items.filter((i) => i.estado === "te_toca");
  if (filtro === "mias") items = items.filter((i) => i.esMia);
  if (filtro === "sin_asignar") items = items.filter((i) => i.estado === "sin_asignar");
  const t = sinAcentos(q.trim());
  if (t) items = items.filter((i) => sinAcentos(i.titulares).includes(t));
  return { items, fallo: false };
}

export interface Mensaje {
  id: string; autor: string; texto: string | null; creado_en: string;
  contacto_id: string | null; usuario_id: string | null; nombreEquipo: string | null; posicion: number | null;
}
export interface Conversacion {
  id: string; estado: string; responsable_id: string | null; responsable: string | null;
  evento: {
    id: string; tipo: string; estado: string; fecha: string | null; lugar: string | null; invitados: number | null; origen: string | null;
    contactos: Contacto[];
  };
  miembros: { nombre: string; rol: string; permiso: string }[];
  mensajes: Mensaje[];
  puedeEscribir: boolean;
}

export async function cargarConversacion(id: string): Promise<Conversacion | null> {
  const sb = await clienteServidor();
  const { data: c, error } = await sb
    .from("conversaciones")
    .select("id,estado,responsable_id,responsable:perfiles!conversaciones_responsable_id_fkey(nombre),evento:eventos(id,tipo,estado,fecha,lugar,invitados,origen,contactos(id,nombre,posicion,email,telefono)),miembros:conversacion_miembros(permiso,usuario:perfiles!conversacion_miembros_usuario_id_fkey(nombre,rol))")
    .eq("id", id).maybeSingle();
  if (error) console.error("conversación:", error.message);
  if (!c) return null;
  const r = c as unknown as {
    id: string; estado: string; responsable_id: string | null; responsable: { nombre: string } | null;
    evento: Conversacion["evento"]; miembros: { permiso: string; usuario: { nombre: string; rol: string } }[];
  };
  const { data: m } = await sb.from("mensajes")
    .select("id,autor,texto,creado_en,contacto_id,usuario_id,usuario:perfiles(nombre)")
    .eq("conversacion_id", id).order("creado_en", { ascending: true }).limit(500);
  const pos = new Map(r.evento.contactos.map((x) => [x.id, x.posicion]));
  const mensajes = ((m ?? []) as unknown as (Omit<Mensaje, "nombreEquipo" | "posicion"> & { usuario: { nombre: string } | null })[]).map((x) => ({
    id: x.id, autor: x.autor, texto: x.texto, creado_en: x.creado_en, contacto_id: x.contacto_id, usuario_id: x.usuario_id,
    nombreEquipo: x.usuario?.nombre ?? null, posicion: x.contacto_id ? pos.get(x.contacto_id) ?? null : null,
  }));
  const { data: puede } = await sb.rpc("puede_escribir_conversacion", { conv: id });
  return {
    id: r.id, estado: r.estado, responsable_id: r.responsable_id, responsable: r.responsable?.nombre ?? null,
    evento: r.evento,
    miembros: r.miembros.map((x) => ({ nombre: x.usuario.nombre, rol: x.usuario.rol, permiso: x.permiso })),
    mensajes, puedeEscribir: puede === true,
  };
}

export async function listarComerciales(): Promise<{ id: string; nombre: string }[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from("perfiles").select("id,nombre").eq("rol", "comercial").eq("activo", true).order("nombre");
  return (data ?? []) as { id: string; nombre: string }[];
}
