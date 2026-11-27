import type { SupabaseClient } from "@supabase/supabase-js";
import type { Registro } from "@/lib/agent";
import type { Almacen, Contexto, Lead } from "./servicio";
import { sinAcentos } from "@/lib/formato";
import { avisarEquipoUnaVez } from "@/lib/avisos";

const DIAS_ENLACE = 30;
const TEXTO_CONSENTIMIENTO = "chat-publico-v1";

function falla(error: { message: string } | null, que: string) {
  if (error) throw new Error(`${que}: ${error.message}`);
}

export function almacenSupabase(sb: SupabaseClient): Almacen {
  async function sistema(conversacionId: string, texto: string) {
    await sb.from("mensajes").insert({ conversacion_id: conversacionId, autor: "sistema", texto });
  }
  async function pendiente(ctx: Contexto, tipo: "reunion" | "pregunta_maria", descripcion: string) {
    const { error } = await sb.from("pendientes").insert({ conversacion_id: ctx.conversacionId, tipo, descripcion });
    falla(error, "crear pendiente");
  }
  async function aSinAsignar(ctx: Contexto) {
    await sb.from("conversaciones").update({ estado: "sin_asignar" }).eq("id", ctx.conversacionId).eq("estado", "maria");
  }

  return {
    async estado(ctx) {
      const { data: ct } = await sb.from("contactos").select("nombre,email,telefono").eq("id", ctx.contactoId).maybeSingle();
      const { data: ev } = await sb.from("eventos").select("tipo,invitados,ficha").eq("id", ctx.eventoId).maybeSingle();
      const { data: re } = await sb.from("reuniones").select("preferencia").eq("evento_id", ctx.eventoId).order("creado_en", { ascending: false }).limit(1).maybeSingle();
      const { data: pe } = await sb.from("pendientes").select("descripcion").eq("conversacion_id", ctx.conversacionId).eq("tipo", "pregunta_maria").is("resuelto_en", null).limit(5);
      const guardado = ct && ct.nombre !== "Visitante";
      const ficha = (ev?.ficha as Record<string, string> | null) ?? {};
      const lead = guardado
        ? [ct!.nombre, ct!.email, ct!.telefono, ev?.tipo, ev?.invitados ? `${ev.invitados} invitados` : null, ficha.fecha_texto].filter(Boolean).join(", ")
        : null;
      return { lead, reunion: re?.preferencia ?? null, avisos: (pe ?? []).map((x) => x.descripcion as string).filter(Boolean) };
    },

    async contarCreadasUltimaHora() {
      const desde = new Date(Date.now() - 3600_000).toISOString();
      const { count, error } = await sb.from("conversaciones").select("id", { count: "exact", head: true }).eq("canal", "web").gte("creado_en", desde);
      falla(error, "contar conversaciones");
      return count ?? 0;
    },

    async crear(tokenHash) {
      const { data: ev, error: e1 } = await sb.from("eventos").insert({ tipo: "otro", estado: "lead", origen: "Chat web" }).select("id").single();
      falla(e1, "crear evento");
      const eventoId = ev!.id as string;
      const { data: ct, error: e2 } = await sb.from("contactos").insert({ evento_id: eventoId, posicion: 1, nombre: "Visitante" }).select("id").single();
      falla(e2, "crear contacto");
      const { data: cv, error: e3 } = await sb.from("conversaciones").insert({ evento_id: eventoId, canal: "web", estado: "maria" }).select("id").single();
      falla(e3, "crear conversación");
      const caduca = new Date(Date.now() + DIAS_ENLACE * 86400_000).toISOString();
      const { error: e4 } = await sb.from("accesos").insert({ contacto_id: ct!.id, token_hash: tokenHash, caduca_en: caduca });
      falla(e4, "crear acceso");
      await sb.from("consentimientos").insert({ conversacion_id: cv!.id, texto_version: TEXTO_CONSENTIMIENTO });
      return { conversacionId: cv!.id as string, contactoId: ct!.id as string, eventoId, estado: "maria" };
    },

    async porToken(tokenHash) {
      const { data: ac } = await sb.from("accesos").select("id,contacto_id,caduca_en,revocado_en").eq("token_hash", tokenHash).maybeSingle();
      if (!ac || ac.revocado_en || new Date(ac.caduca_en).getTime() < Date.now()) return null;
      const { data: ct } = await sb.from("contactos").select("id,evento_id").eq("id", ac.contacto_id).maybeSingle();
      if (!ct) return null;
      const { data: cv } = await sb.from("conversaciones").select("id,estado").eq("evento_id", ct.evento_id).eq("canal", "web").order("creado_en").limit(1).maybeSingle();
      if (!cv) return null;
      await sb.from("accesos").update({ ultimo_uso: new Date().toISOString() }).eq("id", ac.id);
      return { conversacionId: cv.id, contactoId: ct.id, eventoId: ct.evento_id, estado: cv.estado };
    },

    async contarMensajesTitular(conversacionId) {
      const { count, error } = await sb.from("mensajes").select("id", { count: "exact", head: true }).eq("conversacion_id", conversacionId).eq("autor", "titular");
      falla(error, "contar mensajes");
      return count ?? 0;
    },

    async guardarMensaje(m) {
      const { error } = await sb.from("mensajes").insert({ conversacion_id: m.conversacionId, autor: m.autor, contacto_id: m.contactoId ?? null, texto: m.texto });
      falla(error, "guardar mensaje");
      await sb.from("conversaciones").update({ ultima_actividad: new Date().toISOString() }).eq("id", m.conversacionId);
    },

    async historial(conversacionId, limite) {
      const { data, error } = await sb.from("mensajes").select("autor,texto,creado_en").eq("conversacion_id", conversacionId)
        .in("autor", ["titular", "maria", "equipo"]).order("creado_en", { ascending: false }).limit(limite);
      falla(error, "leer historial");
      return (data ?? []).reverse().map((x) => ({ autor: x.autor as string, texto: (x.texto as string | null) ?? "" }));
    },

    async buscarConocimiento(consulta) {
      // Solo letras y números: evita que el texto del cliente altere el filtro de la consulta.
      const palabras = [...new Set(sinAcentos(consulta).split(/[^a-z0-9ñ]+/).filter((p) => p.length >= 3))].slice(0, 5);
      if (palabras.length === 0) return [];
      const filtro = palabras.flatMap((p) => [`pregunta.ilike.%${p}%`, `respuesta.ilike.%${p}%`]).join(",");
      const { data, error } = await sb.from("conocimiento").select("pregunta,respuesta").eq("estado", "publicada").or(filtro).limit(5);
      falla(error, "buscar conocimiento");
      return (data ?? []) as { pregunta: string; respuesta: string }[];
    },

    async guardarLead(ctx, lead: Lead) {
      const { data: antes } = await sb.from("contactos").select("nombre").eq("id", ctx.contactoId).maybeSingle();
      const primera = !antes || antes.nombre === "Visitante";
      await sb.from("contactos").update({ nombre: lead.nombre, email: lead.email ?? null, telefono: lead.telefono ?? null }).eq("id", ctx.contactoId);
      const { data: ev } = await sb.from("eventos").select("ficha").eq("id", ctx.eventoId).maybeSingle();
      const ficha = { ...((ev?.ficha as Record<string, unknown>) ?? {}), ...(lead.fecha ? { fecha_texto: lead.fecha } : {}), ...(lead.notas ? { notas: lead.notas } : {}) };
      const iso = lead.fecha && /^\d{4}-\d{2}-\d{2}$/.test(lead.fecha) ? lead.fecha : null;
      const { error } = await sb.from("eventos").update({ tipo: lead.tipoEvento, fecha: iso, invitados: lead.invitados ?? null, ficha }).eq("id", ctx.eventoId);
      falla(error, "guardar lead");
      await aSinAsignar(ctx);
      await sistema(ctx.conversacionId, primera ? "María ha guardado los datos de contacto" : "María ha actualizado los datos de contacto");
      // D46: alguien que deja sus datos es un contacto que hay que atender; un solo correo por conversación, no por mensaje.
      if (lead.email || lead.telefono) await avisarEquipoUnaVez(sb, ctx.conversacionId, `${lead.nombre} ha dejado sus datos de contacto`);
    },

    async proponerReunion(ctx, preferencia) {
      // Una sola reunión abierta por evento: si ya hay una, se actualiza su preferencia en vez de duplicarla.
      const { data: previa } = await sb.from("reuniones").select("id,preferencia").eq("evento_id", ctx.eventoId).is("confirmada_en", null).order("creado_en", { ascending: false }).limit(1).maybeSingle();
      if (previa) {
        if (previa.preferencia === preferencia) return;
        const { error } = await sb.from("reuniones").update({ preferencia }).eq("id", previa.id);
        falla(error, "actualizar reunión");
        await sb.from("pendientes").update({ descripcion: `Reunión pedida: ${preferencia}` }).eq("conversacion_id", ctx.conversacionId).eq("tipo", "reunion").is("resuelto_en", null);
        await sistema(ctx.conversacionId, "María ha actualizado la preferencia de reunión");
        return;
      }
      const { error } = await sb.from("reuniones").insert({ evento_id: ctx.eventoId, preferencia });
      falla(error, "guardar reunión");
      await pendiente(ctx, "reunion", `Reunión pedida: ${preferencia}`);
      await sistema(ctx.conversacionId, "María ha recogido una preferencia de reunión pendiente de confirmar");
      await avisarEquipoUnaVez(sb, ctx.conversacionId, `Reunión pedida: ${preferencia}`);
    },

    async avisarEquipo(ctx, motivo) {
      const { data: igual } = await sb.from("pendientes").select("id").eq("conversacion_id", ctx.conversacionId).eq("tipo", "pregunta_maria").eq("descripcion", motivo).is("resuelto_en", null).limit(1).maybeSingle();
      if (igual) return;
      await pendiente(ctx, "pregunta_maria", motivo);
      await aSinAsignar(ctx);
      await sistema(ctx.conversacionId, "María ha avisado al equipo");
    },

    async esperaPersona(ctx) {
      const { data: cv } = await sb.from("conversaciones").select("responsable_id").eq("id", ctx.conversacionId).maybeSingle();
      await sb.from("conversaciones").update({ estado: cv?.responsable_id ? "te_toca" : "sin_asignar", ultima_actividad: new Date().toISOString() }).eq("id", ctx.conversacionId);
      await avisarEquipoUnaVez(sb, ctx.conversacionId, "Han vuelto a escribir en una conversación que lleva el equipo");
    },

    async registrarEjecucion(ctx, r: Registro) {
      await sb.from("agente_ejecuciones").insert({
        conversacion_id: ctx.conversacionId, modelo: r.modelo, version_prompt: r.versionPrompt, herramientas: r.herramientas,
        tokens_entrada: r.tokensEntrada, tokens_salida: r.tokensSalida, duracion_ms: r.duracionMs,
      });
    },
  };
}
