import type { SupabaseClient } from "@supabase/supabase-js";
import type { Registro } from "@/lib/agent";
import { almacenSupabase } from "@/lib/chat/almacen-supabase";
import { crearAviso } from "@/lib/avisos";
import type { AlmacenNovios, MensajeVisible } from "./servicio";

function falla(error: { message: string } | null, que: string) { if (error) throw new Error(`${que}: ${error.message}`); }
const REFRESCO_USO_MS = 60_000;

export function almacenNovios(sb: SupabaseClient): AlmacenNovios {
  const base = almacenSupabase(sb);
  async function sistema(conversacionId: string, texto: string) { await sb.from("mensajes").insert({ conversacion_id: conversacionId, autor: "sistema", texto }); }
  async function pendiente(ctx: { conversacionId: string }, tipo: "cambio" | "audio_foto" | "pregunta_maria" | "nota", descripcion: string) {
    const { error } = await sb.from("pendientes").insert({ conversacion_id: ctx.conversacionId, tipo, descripcion });
    falla(error, "crear pendiente");
  }
  async function teToca(conversacionId: string) {
    await sb.from("conversaciones").update({ estado: "te_toca", ultima_actividad: new Date().toISOString() }).eq("id", conversacionId).neq("estado", "sin_asignar");
  }

  return {
    async porToken(tokenHash) {
      const { data: ac } = await sb.from("accesos").select("id,contacto_id,caduca_en,revocado_en,ultimo_uso").eq("token_hash", tokenHash).maybeSingle();
      if (!ac || ac.revocado_en || new Date(ac.caduca_en).getTime() <= Date.now()) return null;
      const { data: ct } = await sb.from("contactos").select("id,evento_id,nombre").eq("id", ac.contacto_id).maybeSingle();
      if (!ct) return null;
      // Un único hilo por boda: la conversación más antigua. Los dos titulares escriben en ella.
      const { data: cv } = await sb.from("conversaciones").select("id,estado").eq("evento_id", ct.evento_id).order("creado_en").limit(1).maybeSingle();
      if (!cv) return null;
      if (!ac.ultimo_uso || Date.now() - new Date(ac.ultimo_uso).getTime() > REFRESCO_USO_MS) {
        await sb.from("accesos").update({ ultimo_uso: new Date().toISOString() }).eq("id", ac.id);
      }
      return { conversacionId: cv.id, contactoId: ct.id, eventoId: ct.evento_id, estado: cv.estado, nombre: ct.nombre };
    },

    async contarMensajesTitularUltimaHora(conversacionId) {
      const desde = new Date(Date.now() - 3600_000).toISOString();
      const { count, error } = await sb.from("mensajes").select("id", { count: "exact", head: true }).eq("conversacion_id", conversacionId).eq("autor", "titular").gte("creado_en", desde);
      falla(error, "contar mensajes");
      return count ?? 0;
    },

    async guardarMensaje(m) {
      const { data, error } = await sb.from("mensajes").insert({ conversacion_id: m.conversacionId, autor: m.autor, contacto_id: m.contactoId ?? null, texto: m.texto }).select("id").single();
      falla(error, "guardar mensaje");
      await sb.from("conversaciones").update({ ultima_actividad: new Date().toISOString() }).eq("id", m.conversacionId);
      return data!.id as string;
    },

    /** Solo lo que pueden ver los novios: sus mensajes, los de María y los del equipo. Las notas internas y los avisos del sistema se filtran aquí, en el servidor. */
    async historial(conversacionId, limite) {
      const { data, error } = await sb.from("mensajes").select("id,autor,texto,creado_en,contacto_id,usuario_id").eq("conversacion_id", conversacionId)
        .in("autor", ["titular", "maria", "equipo"]).order("creado_en", { ascending: false }).limit(limite);
      falla(error, "leer historial");
      const filas = (data ?? []).reverse();
      const cIds = [...new Set(filas.map((f) => f.contacto_id).filter(Boolean))] as string[];
      const uIds = [...new Set(filas.map((f) => f.usuario_id).filter(Boolean))] as string[];
      const { data: cs } = cIds.length ? await sb.from("contactos").select("id,nombre,posicion").in("id", cIds) : { data: [] };
      const { data: ps } = uIds.length ? await sb.from("perfiles").select("id,nombre,foto_url").in("id", uIds) : { data: [] };
      const cm = new Map((cs ?? []).map((c) => [c.id as string, c]));
      const pm = new Map((ps ?? []).map((p) => [p.id as string, p]));
      return filas.map((f): MensajeVisible => {
        const c = f.contacto_id ? cm.get(f.contacto_id) : undefined;
        const p = f.usuario_id ? pm.get(f.usuario_id) : undefined;
        return {
          id: f.id, autor: f.autor as MensajeVisible["autor"], texto: (f.texto as string | null) ?? "", creadoEn: f.creado_en,
          nombre: (c?.nombre ?? p?.nombre ?? null) as string | null, posicion: (c?.posicion ?? null) as number | null, foto: (p?.foto_url ?? null) as string | null,
        };
      });
    },

    async estado(ctx) {
      const { data: ca } = await sb.from("peticiones_cambio").select("campo,valor_pedido").eq("evento_id", ctx.eventoId).eq("estado", "pendiente").limit(10);
      const { data: pe } = await sb.from("pendientes").select("descripcion").eq("conversacion_id", ctx.conversacionId).eq("tipo", "pregunta_maria").is("resuelto_en", null).limit(5);
      return { cambios: (ca ?? []).map((x) => `${x.campo}: ${x.valor_pedido}`), avisos: (pe ?? []).map((x) => x.descripcion as string).filter(Boolean) };
    },

    buscarConocimiento: (c) => base.buscarConocimiento(c),

    /** Columnas elegidas una a una: NUNCA dato_interes, estado, origen, notas ni alergias. */
    async leerFicha(ctx) {
      const { data: ev } = await sb.from("eventos").select("fecha,lugar,tipo_ceremonia,hora_ceremonia,hora_banquete,adultos,ninos,menu,responsable_id").eq("id", ctx.eventoId).maybeSingle();
      const { data: ts } = await sb.from("contactos").select("nombre,posicion").eq("evento_id", ctx.eventoId).order("posicion");
      const f: Record<string, string> = {};
      if (!ev) return f;
      f["Titulares"] = (ts ?? []).map((t) => t.nombre).join(" y ");
      if (ev.fecha) f["Fecha"] = ev.fecha;
      if (ev.lugar) f["Espacio"] = ev.lugar;
      if (ev.tipo_ceremonia) f["Tipo de ceremonia"] = ev.tipo_ceremonia;
      if (ev.hora_ceremonia) f["Hora de la ceremonia"] = String(ev.hora_ceremonia).slice(0, 5);
      if (ev.hora_banquete) f["Hora del banquete"] = String(ev.hora_banquete).slice(0, 5);
      if (ev.adultos != null) f["Adultos"] = String(ev.adultos);
      if (ev.ninos != null) f["Niños"] = String(ev.ninos);
      if (ev.menu) f["Menú"] = ev.menu;
      if (ev.responsable_id) {
        const { data: p } = await sb.from("perfiles").select("nombre").eq("id", ev.responsable_id).maybeSingle();
        if (p) f["Comercial"] = p.nombre;
      }
      return f;
    },

    async registrarCambio(ctx, c) {
      const { data: igual } = await sb.from("peticiones_cambio").select("id").eq("evento_id", ctx.eventoId).eq("estado", "pendiente").eq("campo", c.campo).eq("valor_pedido", c.valorPedido).limit(1).maybeSingle();
      if (igual) return { id: igual.id as string };
      const { data, error } = await sb.from("peticiones_cambio").insert({ evento_id: ctx.eventoId, contacto_id: ctx.contactoId, campo: c.campo, valor_pedido: c.valorPedido }).select("id").single();
      falla(error, "registrar cambio");
      await pendiente(ctx, "cambio", `${ctx.nombre} pide cambiar ${c.campo}: ${c.valorPedido}`);
      await sistema(ctx.conversacionId, "María ha registrado una petición de cambio pendiente de validar");
      await this.avisarEquipo(ctx, `${ctx.nombre} pide un cambio: ${c.campo} → ${c.valorPedido}`);
      return { id: data!.id as string };
    },

    async crearPendiente(ctx, p) {
      const { data, error } = await sb.from("pendientes").insert({ conversacion_id: ctx.conversacionId, tipo: p.tipo, descripcion: p.descripcion }).select("id").single();
      falla(error, "crear pendiente");
      await sistema(ctx.conversacionId, "María ha creado una tarea para el equipo");
      await this.avisarEquipo(ctx, p.descripcion);
      return { id: data!.id as string };
    },

    async proponerReunion(ctx, preferencia) { await base.proponerReunion(ctx, preferencia); await this.avisarEquipo(ctx, `Reunión pedida: ${preferencia}`); },

    async avisarEquipo(ctx, motivo) {
      const { data: igual } = await sb.from("pendientes").select("id").eq("conversacion_id", ctx.conversacionId).eq("tipo", "pregunta_maria").eq("descripcion", motivo).is("resuelto_en", null).limit(1).maybeSingle();
      if (!igual) { await pendiente(ctx, "pregunta_maria", motivo); await sistema(ctx.conversacionId, "María ha avisado al equipo"); }
      // Un solo aviso por correo mientras el equipo no conteste en esta conversación.
      const { data: ultimoEquipo } = await sb.from("mensajes").select("creado_en").eq("conversacion_id", ctx.conversacionId).eq("autor", "equipo").order("creado_en", { ascending: false }).limit(1).maybeSingle();
      let consulta = sb.from("avisos").select("id").eq("conversacion_id", ctx.conversacionId).eq("tipo", "equipo_te_toca").is("descartado_en", null);
      if (ultimoEquipo) consulta = consulta.gt("creado_en", ultimoEquipo.creado_en);
      const { data: previo } = await consulta.limit(1).maybeSingle();
      await teToca(ctx.conversacionId);
      if (!previo) await crearAviso(sb, { tipo: "equipo_te_toca", conversacionId: ctx.conversacionId, motivo });
    },

    async registrarEjecucion(ctx, r: Registro) { await base.registrarEjecucion({ conversacionId: ctx.conversacionId, contactoId: ctx.contactoId, eventoId: ctx.eventoId, estado: ctx.estado }, r); },
  };
}
