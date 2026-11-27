"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { perfilActivo } from "@/lib/sesion";
import { validarFicha } from "@/lib/ficha";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { crearAviso } from "@/lib/avisos";

/** D40: el titular que escribió por última vez recibe un correo (agrupado). Es un aviso en cola: no bloquea ni falla el envío del mensaje. */
async function avisarNovios(conversacionId: string, mensajeId?: string) {
  try {
    const admin = clienteAdmin();
    const { data: ult } = await admin.from("mensajes").select("contacto_id").eq("conversacion_id", conversacionId).eq("autor", "titular").order("creado_en", { ascending: false }).limit(1).maybeSingle();
    if (ult?.contacto_id) await crearAviso(admin, { tipo: "novios_respuesta", conversacionId, contactoId: ult.contacto_id, mensajeId });
  } catch (e) { console.error("aviso a novios:", e instanceof Error ? e.message : "error"); }
}

export async function enviarMensaje(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = String(formData.get("conversacion") ?? "");
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 4000);
  const modo = formData.get("modo") === "nota_interna" ? "nota_interna" : "equipo";
  if (!id || !texto) return;
  const sb = await clienteServidor();
  const { data: nuevo, error } = await sb.from("mensajes").insert({ conversacion_id: id, autor: modo, usuario_id: perfil.id, texto }).select("id").single();
  if (error) redirect(`/equipo/c/${id}?error=envio`);
  if (modo === "equipo" && hayClaveDeServicio()) await avisarNovios(id, nuevo?.id);
  await sb.from("conversaciones").update({ ultima_actividad: new Date().toISOString(), ...(modo === "equipo" ? { estado: "humano" } : {}) }).eq("id", id);
  revalidatePath(`/equipo/c/${id}`);
  redirect(`/equipo/c/${id}`);
}

export async function cerrarConversacion(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = String(formData.get("conversacion") ?? "");
  const sb = await clienteServidor();
  await sb.from("conversaciones").update({ estado: "cerrada" }).eq("id", id);
  revalidatePath("/equipo");
  redirect(`/equipo/c/${id}`);
}

export async function reabrirConversacion(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = String(formData.get("conversacion") ?? "");
  if (!id) return;
  const sb = await clienteServidor();
  // La lleva alguien: "te_toca". Si no: "sin_asignar". María no se reactiva sola.
  const { data: conv } = await sb.from("conversaciones").select("responsable_id").eq("id", id).eq("estado", "cerrada").maybeSingle();
  if (!conv) redirect(`/equipo/c/${id}`);
  const estado = conv.responsable_id ? "te_toca" : "sin_asignar";
  await sb.from("conversaciones").update({ estado, ultima_actividad: new Date().toISOString() }).eq("id", id).eq("estado", "cerrada");
  revalidatePath("/equipo");
  redirect(`/equipo/c/${id}`);
}

export async function asignarConversacion(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = String(formData.get("conversacion") ?? "");
  const comercial = String(formData.get("comercial") ?? "");
  if (!id) return;
  // Solo el administrador asigna. Lo vuelve a comprobar la base de datos.
  if (perfil.rol !== "administrador" || !comercial) redirect(`/equipo/c/${id}?error=asignar`);
  const sb = await clienteServidor();
  const { error } = await sb.rpc("asignar_conversacion", { conv: id, comercial });
  if (error) { console.error("asignar:", error.message); redirect(`/equipo/c/${id}?error=asignar`); }
  revalidatePath("/equipo");
  redirect(`/equipo/c/${id}`);
}

const TIPOS = ["boda", "empresa", "otro"] as const;

export async function crearContacto(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const txt = (k: string) => String(formData.get(k) ?? "").trim();
  const nombre1 = txt("nombre1");
  if (!nombre1) redirect("/equipo/nuevo?error=nombre");
  const tipo = (TIPOS as readonly string[]).includes(txt("tipo")) ? txt("tipo") : "boda";
  const esAdmin = perfil.rol === "administrador";
  let responsable: string | null = esAdmin ? (txt("asignar") || null) : perfil.id;
  if (!esAdmin && perfil.rol !== "comercial") redirect("/equipo");
  if (responsable === "sin") responsable = null;
  const invitados = Number.parseInt(txt("invitados"), 10);
  const sb = await clienteServidor();
  const { data: ev, error: e1 } = await sb.from("eventos").insert({
    tipo, estado: "lead", fecha: txt("fecha") || null, lugar: txt("lugar") || null,
    invitados: Number.isFinite(invitados) && invitados >= 0 ? invitados : null,
    origen: txt("origen") || null, responsable_id: responsable, creado_por: perfil.id,
  }).select("id").single();
  if (e1 || !ev) redirect("/equipo/nuevo?error=guardar");
  const contactos = [{ evento_id: ev.id, posicion: 1, nombre: nombre1, email: txt("correo1") || null, telefono: txt("telefono1") || null }];
  if (txt("nombre2")) contactos.push({ evento_id: ev.id, posicion: 2, nombre: txt("nombre2"), email: txt("correo2") || null, telefono: null });
  const { error: e2 } = await sb.from("contactos").insert(contactos);
  if (e2) redirect("/equipo/nuevo?error=guardar");
  const { data: conv, error: e3 } = await sb.from("conversaciones").insert({
    evento_id: ev.id, canal: "manual", estado: responsable ? "te_toca" : "sin_asignar", responsable_id: responsable,
  }).select("id").single();
  if (e3 || !conv) redirect("/equipo/nuevo?error=guardar");
  const original = txt("original").slice(0, 8000);
  if (original) {
    await sb.from("mensajes").insert({ conversacion_id: conv.id, autor: "nota_interna", usuario_id: perfil.id, texto: `Correo original:\n${original}` });
  }
  revalidatePath("/equipo");
  redirect(`/equipo/c/${conv.id}`);
}

/** Guarda la ficha de la boda. La base de datos solo deja a la responsable y a los administradores (política eventos_editar). */
export async function editarFicha(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const conv = String(formData.get("conversacion") ?? "");
  if (!conv) redirect("/equipo");
  const v = validarFicha(formData);
  if (!v.ok) redirect(`/equipo/c/${conv}/ficha?error=${v.error}`);
  const sb = await clienteServidor();
  const { data: c } = await sb.from("conversaciones").select("evento_id").eq("id", conv).maybeSingle();
  if (!c) redirect("/equipo");
  const { valores: x } = v;
  const { data: filas, error } = await sb.from("eventos").update({
    tipo: x.tipo, estado: x.estado, origen: x.origen, fecha: x.fecha, lugar: x.lugar, tipo_ceremonia: x.tipo_ceremonia,
    hora_ceremonia: x.hora_ceremonia, hora_banquete: x.hora_banquete, adultos: x.adultos, ninos: x.ninos, invitados: x.invitados,
    menu: x.menu, dato_interes: x.dato_interes, actualizado_en: new Date().toISOString(),
  }).eq("id", c.evento_id).select("id");
  if (error || !filas || filas.length === 0) {
    if (error) console.error("ficha:", error.message);
    redirect(`/equipo/c/${conv}/ficha?error=${error ? "guardar" : "permiso"}`);
  }
  const titulares = [{ evento_id: c.evento_id, posicion: 1, nombre: x.titular1.nombre, telefono: x.titular1.telefono, email: x.titular1.email }];
  // El titular 2 solo se guarda si tiene nombre. Nada se borra: dejarlo en blanco no lo elimina.
  if (x.titular2) titulares.push({ evento_id: c.evento_id, posicion: 2, nombre: x.titular2.nombre, telefono: x.titular2.telefono, email: x.titular2.email });
  const { error: e2 } = await sb.from("contactos").upsert(titulares, { onConflict: "evento_id,posicion" });
  if (e2) { console.error("titulares:", e2.message); redirect(`/equipo/c/${conv}/ficha?error=guardar`); }
  revalidatePath("/equipo");
  redirect(`/equipo/c/${conv}`);
}
