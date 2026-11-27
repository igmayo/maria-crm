import { clienteServidor } from "@/lib/supabase/servidor";
import { sinAcentos } from "@/lib/formato";

export type Filtro = "todas" | "te_toca" | "mias" | "sin_asignar";

export interface ItemBandeja {
  id: string; titulares: string; estado: string; responsable: string | null; responsableId: string | null; esMia: boolean;
  ultimoTexto: string; ultimaActividad: string; cambios: number;
}

interface Contacto { id?: string; nombre: string; posicion: number; email?: string | null; telefono?: string | null }

export function nombreTitulares(c: Contacto[]): string {
  return [...c].sort((a, b) => a.posicion - b.posicion).map((x) => x.nombre).join(" y ") || "Sin nombre";
}

export async function listarBandeja(filtro: Filtro, q: string, miId: string, responsable?: string): Promise<{ items: ItemBandeja[]; fallo: boolean }> {
  const sb = await clienteServidor();
  const { data: convs, error } = await sb
    .from("conversaciones")
    .select("id,estado,responsable_id,ultima_actividad,evento_id,evento:eventos(tipo,contactos(nombre,posicion)),responsable:perfiles!conversaciones_responsable_id_fkey(nombre)")
    .order("ultima_actividad", { ascending: false })
    .limit(100);
  if (error) { console.error("bandeja:", error.message); return { items: [], fallo: true }; }
  const lista = (convs ?? []) as unknown as {
    id: string; estado: string; responsable_id: string | null; ultima_actividad: string; evento_id: string;
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
  const { data: pend } = await sb.from("peticiones_cambio").select("evento_id").eq("estado", "pendiente").in("evento_id", [...new Set(lista.map((c) => c.evento_id))]);
  const cambiosPorEvento = new Map<string, number>();
  for (const x of (pend ?? []) as { evento_id: string }[]) cambiosPorEvento.set(x.evento_id, (cambiosPorEvento.get(x.evento_id) ?? 0) + 1);
  let items: ItemBandeja[] = lista.map((c) => ({
    id: c.id, titulares: nombreTitulares(c.evento?.contactos ?? []), estado: c.estado,
    responsable: c.responsable?.nombre ?? null, responsableId: c.responsable_id, esMia: c.responsable_id === miId,
    ultimoTexto: ultimo.get(c.id) ?? "Sin mensajes todavía", ultimaActividad: c.ultima_actividad, cambios: cambiosPorEvento.get(c.evento_id) ?? 0,
  }));
  if (filtro === "te_toca") items = items.filter((i) => i.estado === "te_toca");
  if (filtro === "mias") items = items.filter((i) => i.esMia);
  if (filtro === "sin_asignar") items = items.filter((i) => i.estado === "sin_asignar");
  if (responsable) items = items.filter((i) => i.responsableId === responsable);
  const t = sinAcentos(q.trim());
  if (t) items = items.filter((i) => sinAcentos(i.titulares).includes(t));
  return { items, fallo: false };
}

export interface Mensaje {
  id: string; autor: string; texto: string | null; creado_en: string;
  contacto_id: string | null; usuario_id: string | null; nombreEquipo: string | null; posicion: number | null;
}
export interface CambioPedido {
  id: string; campo: string; valorActual: string | null; valorPedido: string; estado: "pendiente" | "aprobada" | "rechazada";
  nota: string | null; titular: string | null; posicion: number | null; creadoEn: string; decididoPor: string | null; decididoEn: string | null;
}

export interface Conversacion {
  id: string; estado: string; responsable_id: string | null; responsable: string | null;
  evento: {
    id: string; tipo: string; estado: string; fecha: string | null; lugar: string | null; invitados: number | null; origen: string | null;
    tipo_ceremonia: string | null; hora_ceremonia: string | null; hora_banquete: string | null;
    adultos: number | null; ninos: number | null; menu: string | null; dato_interes: string | null;
    contactos: Contacto[];
  };
  miembros: { nombre: string; rol: string; permiso: string }[];
  mensajes: Mensaje[];
  puedeEscribir: boolean;
  cambios: CambioPedido[];
  /** Solo la responsable de la boda y los administradores editan la ficha y dan acceso a los novios. */
  puedeEditarFicha: boolean;
}

export async function cargarConversacion(id: string): Promise<Conversacion | null> {
  const sb = await clienteServidor();
  const { data: c, error } = await sb
    .from("conversaciones")
    .select("id,estado,responsable_id,responsable:perfiles!conversaciones_responsable_id_fkey(nombre),evento:eventos(id,tipo,estado,fecha,lugar,invitados,origen,tipo_ceremonia,hora_ceremonia,hora_banquete,adultos,ninos,menu,dato_interes,contactos(id,nombre,posicion,email,telefono)),miembros:conversacion_miembros(permiso,usuario:perfiles!conversacion_miembros_usuario_id_fkey(nombre,rol))")
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
  const { data: puedeFicha } = await sb.rpc("es_responsable_evento", { ev: r.evento.id });
  const { data: pc } = await sb.from("peticiones_cambio").select("id,campo,valor_actual,valor_pedido,estado,nota,creado_en,validado_en,validado_por,contacto_id")
    .eq("evento_id", r.evento.id).order("creado_en", { ascending: false }).limit(30);
  const filas = (pc ?? []) as { id: string; campo: string; valor_actual: string | null; valor_pedido: string; estado: CambioPedido["estado"]; nota: string | null; creado_en: string; validado_en: string | null; validado_por: string | null; contacto_id: string | null }[];
  const ids = [...new Set(filas.map((f) => f.validado_por).filter(Boolean))] as string[];
  const { data: vs } = ids.length ? await sb.from("perfiles").select("id,nombre").in("id", ids) : { data: [] };
  const nombreVal = new Map((vs ?? []).map((v) => [v.id as string, v.nombre as string]));
  const tit = new Map(r.evento.contactos.map((x) => [x.id, x]));
  const cambios: CambioPedido[] = filas.map((f) => ({
    id: f.id, campo: f.campo, valorActual: f.valor_actual, valorPedido: f.valor_pedido, estado: f.estado, nota: f.nota,
    titular: f.contacto_id ? tit.get(f.contacto_id)?.nombre ?? null : null, posicion: f.contacto_id ? tit.get(f.contacto_id)?.posicion ?? null : null,
    creadoEn: f.creado_en, decididoPor: f.validado_por ? nombreVal.get(f.validado_por) ?? null : null, decididoEn: f.validado_en,
  }));
  return {
    id: r.id, estado: r.estado, responsable_id: r.responsable_id, responsable: r.responsable?.nombre ?? null,
    evento: r.evento, cambios,
    miembros: r.miembros.map((x) => ({ nombre: x.usuario.nombre, rol: x.usuario.rol, permiso: x.permiso })),
    mensajes, puedeEscribir: puede === true, puedeEditarFicha: puedeFicha === true,
  };
}

export async function listarComerciales(): Promise<{ id: string; nombre: string }[]> {
  const sb = await clienteServidor();
  const { data } = await sb.from("perfiles").select("id,nombre").eq("rol", "comercial").eq("activo", true).order("nombre");
  return (data ?? []) as { id: string; nombre: string }[];
}

export interface UsuarioPanel {
  id: string; nombre: string; email: string; rol: string; activo: boolean;
  /** undefined = no se pudo consultar; null = nunca ha entrado */
  ultimoAcceso: string | null | undefined;
  conversaciones: number;
}

/** Solo para el administrador: el panel de usuarios. El último acceso viene de Auth (clave de servicio, solo lectura). */
export async function listarUsuarios(): Promise<UsuarioPanel[]> {
  const sb = await clienteServidor();
  const { data: perfiles } = await sb.from("perfiles").select("id,nombre,email,rol,activo").order("activo", { ascending: false }).order("nombre");
  const { data: convs } = await sb.from("conversaciones").select("responsable_id").neq("estado", "cerrada").not("responsable_id", "is", null).limit(5000);
  const cuenta = new Map<string, number>();
  for (const c of (convs ?? []) as { responsable_id: string }[]) cuenta.set(c.responsable_id, (cuenta.get(c.responsable_id) ?? 0) + 1);
  const acceso = new Map<string, string | null>();
  let conAcceso = false;
  try {
    const { clienteAdmin, hayClaveDeServicio } = await import("@/lib/supabase/admin");
    if (hayClaveDeServicio()) {
      const { data } = await clienteAdmin().auth.admin.listUsers({ perPage: 1000 });
      for (const u of data?.users ?? []) acceso.set(u.id, u.last_sign_in_at ?? null);
      conAcceso = Boolean(data);
    }
  } catch (e) { console.error("usuarios (acceso):", e instanceof Error ? e.message : "fallo"); }
  return ((perfiles ?? []) as { id: string; nombre: string; email: string; rol: string; activo: boolean }[]).map((p) => ({
    ...p, conversaciones: cuenta.get(p.id) ?? 0,
    ultimoAcceso: conAcceso && acceso.has(p.id) ? acceso.get(p.id) : undefined,
  }));
}
