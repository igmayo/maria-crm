"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { perfilActivo } from "@/lib/sesion";

export async function enviarMensaje(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = String(formData.get("conversacion") ?? "");
  const texto = String(formData.get("texto") ?? "").trim().slice(0, 4000);
  const modo = formData.get("modo") === "nota_interna" ? "nota_interna" : "equipo";
  if (!id || !texto) return;
  const sb = await clienteServidor();
  const { error } = await sb.from("mensajes").insert({ conversacion_id: id, autor: modo, usuario_id: perfil.id, texto });
  if (error) redirect(`/equipo/c/${id}?error=envio`);
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
