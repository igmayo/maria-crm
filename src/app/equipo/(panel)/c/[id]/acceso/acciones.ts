"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { hayClaveDeServicio } from "@/lib/supabase/admin";
import { perfilActivo } from "@/lib/sesion";
import { enviarCorreo } from "@/lib/correo";
import { correoHtml, correoTexto } from "@/lib/plantilla-correo";
import { urlBase } from "@/lib/usuarios";
import { caducaEn, enlaceNovios, contenidoEnlaceNovios } from "@/lib/acceso";
import { crearEnlace, anularEnlaces, marcarEnviado } from "@/lib/acceso-servidor";

export interface EstadoAcceso { ok?: boolean; error?: string; mensaje?: string; enlace?: string; copiar?: boolean }

/** Enviar por correo, copiar enlace o anular. Solo la responsable de la boda y los administradores (se comprueba con la sesión de la persona). */
export async function gestionarAcceso(_prev: EstadoAcceso, formData: FormData): Promise<EstadoAcceso> {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (!hayClaveDeServicio()) return { error: "Falta la clave de servicio de Supabase en el servidor." };
  const conv = String(formData.get("conversacion") ?? "");
  const contactoId = String(formData.get("contacto") ?? "");
  const accion = String(formData.get("accion") ?? "");
  if (!["enviar", "copiar", "anular"].includes(accion)) return { error: "Acción no válida." };
  const sb = await clienteServidor();
  const { data: c } = await sb.from("conversaciones").select("evento_id").eq("id", conv).maybeSingle();
  if (!c) return { error: "No se ha encontrado la conversación." };
  const { data: puede } = await sb.rpc("es_responsable_evento", { ev: c.evento_id });
  if (puede !== true) return { error: "Solo la responsable de la boda y los administradores pueden dar acceso." };
  const { data: titular } = await sb.from("contactos").select("id,nombre,email").eq("id", contactoId).eq("evento_id", c.evento_id).maybeSingle();
  if (!titular) return { error: "No se ha encontrado al titular." };
  const { data: ev } = await sb.from("eventos").select("fecha,responsable_id").eq("id", c.evento_id).maybeSingle();
  if (!ev?.fecha) return { error: "Pon la fecha de la boda en la ficha antes de dar acceso: el enlace se cierra 30 días después." };
  const caduca = caducaEn(ev.fecha);
  if (caduca.getTime() <= Date.now()) return { error: "La boda ya pasó hace más de 30 días: el acceso está cerrado." };

  if (accion === "anular") {
    if (!(await anularEnlaces(titular.id))) return { error: "No se han podido anular los enlaces. Inténtalo de nuevo." };
    const token = await crearEnlace(titular.id, caduca, false);
    revalidatePath(`/equipo/c/${conv}/acceso`);
    if (!token) return { error: "Se anularon los enlaces anteriores, pero no se pudo crear el nuevo. Pulsa “Copiar enlace”." };
    return { ok: true, mensaje: "Enlaces anteriores anulados. Este es el nuevo (cópialo ahora, no se puede volver a ver):", enlace: enlaceNovios(urlBase(), token), copiar: true };
  }

  if (accion === "copiar") {
    const token = await crearEnlace(titular.id, caduca, false);
    revalidatePath(`/equipo/c/${conv}/acceso`);
    if (!token) return { error: "No se ha podido crear el enlace. Inténtalo de nuevo." };
    return { ok: true, mensaje: "Enlace creado. Cópialo ahora, no se puede volver a ver:", enlace: enlaceNovios(urlBase(), token), copiar: true };
  }

  if (!titular.email) return { error: "Este titular no tiene correo en la ficha. Usa “Copiar enlace” o añade el correo." };
  const token = await crearEnlace(titular.id, caduca, false);
  if (!token) return { error: "No se ha podido crear el enlace. Inténtalo de nuevo." };
  const base = urlBase();
  const enlace = enlaceNovios(base, token);
  // Si responden, la respuesta llega a su comercial; si no hay, a quien envía.
  let responderA = perfil.email;
  let comercial: string | null = null;
  if (ev.responsable_id) {
    const { data: r } = await sb.from("perfiles").select("nombre,email").eq("id", ev.responsable_id).maybeSingle();
    if (r?.email) responderA = r.email;
    comercial = r?.nombre ?? null;
  }
  const { asunto, contenido } = contenidoEnlaceNovios(titular.nombre, comercial, enlace);
  const enviado = await enviarCorreo({ para: titular.email, asunto, texto: correoTexto(contenido), html: correoHtml(contenido, base), responderA });
  revalidatePath(`/equipo/c/${conv}/acceso`);
  if (enviado) { await marcarEnviado(token); return { ok: true, mensaje: `Enlace enviado a ${titular.email}.` }; }
  return { ok: true, mensaje: `No se pudo enviar el correo a ${titular.email}. Pásale tú este enlace (cópialo ahora, no se puede volver a ver):`, enlace, copiar: true };
}
