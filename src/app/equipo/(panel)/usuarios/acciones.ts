"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { perfilActivo } from "@/lib/sesion";
import { enviarCorreo } from "@/lib/correo";
import { ROLES, validarInvitacion, enlaceInvitacion, textoInvitacion, urlBase } from "@/lib/usuarios";

export interface EstadoInvitar { ok?: boolean; error?: string; mensaje?: string; enlace?: string }

const MENSAJES_ERROR = { nombre: "Escribe el nombre (al menos 2 letras).", correo: "El correo no parece válido.", rol: "Elige un rol." } as const;

/** Prepara el enlace, lo envía por correo y, solo si el correo falla, lo devuelve para copiarlo. */
async function entregar(nombre: string, correo: string, tokenHash: string, tipo: "invite" | "recovery", quien: string, reenvio: boolean): Promise<EstadoInvitar> {
  const enlace = enlaceInvitacion(urlBase(), tokenHash, tipo);
  const { asunto, texto } = textoInvitacion(nombre, quien, enlace, reenvio);
  const enviado = await enviarCorreo({ para: correo, asunto, texto });
  if (enviado) return { ok: true, mensaje: `Invitación enviada a ${correo}.` };
  return { ok: true, mensaje: `No se pudo enviar el correo a ${correo}. Pásale este enlace tú (es de un solo uso):`, enlace };
}

export async function invitarUsuario(_prev: EstadoInvitar, formData: FormData): Promise<EstadoInvitar> {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador") return { error: "Solo los administradores pueden invitar." };
  if (!hayClaveDeServicio()) return { error: "Falta la clave de servicio de Supabase en el servidor." };
  const v = validarInvitacion(String(formData.get("nombre") ?? ""), String(formData.get("correo") ?? ""), String(formData.get("rol") ?? ""));
  if (!v.ok) return { error: MENSAJES_ERROR[v.error] };
  const sb = await clienteServidor();
  const { data: existe } = await sb.from("perfiles").select("id").eq("email", v.correo).maybeSingle();
  if (existe) return { error: "Ya hay un usuario con ese correo. Edítalo en la lista." };
  const { data, error } = await clienteAdmin().auth.admin.generateLink({ type: "invite", email: v.correo, options: { data: { nombre: v.nombre } } });
  if (error || !data?.user || !data.properties?.hashed_token) {
    console.error("invitar:", error?.message ?? "sin datos");
    return { error: "No se ha podido crear la invitación. Inténtalo de nuevo." };
  }
  // El alta nace desactivada. La activa el administrador con SU sesión, así que mandan las reglas de la base de datos.
  const { error: e2 } = await sb.from("perfiles").update({ rol: v.rol, activo: true }).eq("id", data.user.id);
  if (e2) {
    console.error("invitar (activar):", e2.message);
    return { error: "La cuenta se creó pero no se pudo activar. Edítala en la lista." };
  }
  revalidatePath("/equipo/usuarios");
  return entregar(v.nombre, v.correo, data.properties.hashed_token, "invite", perfil.nombre, false);
}

export async function reenviarInvitacion(_prev: EstadoInvitar, formData: FormData): Promise<EstadoInvitar> {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador") return { error: "Solo los administradores pueden reenviar invitaciones." };
  if (!hayClaveDeServicio()) return { error: "Falta la clave de servicio de Supabase en el servidor." };
  const id = String(formData.get("usuario") ?? "");
  const sb = await clienteServidor();
  const { data: u } = await sb.from("perfiles").select("nombre,email,activo").eq("id", id).maybeSingle();
  if (!u || !u.activo) return { error: "Ese usuario no está activo." };
  const { data, error } = await clienteAdmin().auth.admin.generateLink({ type: "recovery", email: u.email });
  if (error || !data.properties?.hashed_token) {
    console.error("reenviar:", error?.message ?? "sin datos");
    return { error: "No se ha podido crear el nuevo enlace." };
  }
  return entregar(u.nombre, u.email, data.properties.hashed_token, "recovery", perfil.nombre, true);
}

export async function editarUsuario(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador") redirect("/equipo/usuarios?error=permiso");
  const id = String(formData.get("usuario") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim().replace(/\s+/g, " ");
  const rol = String(formData.get("rol") ?? "");
  const activo = formData.get("activo") === "si";
  if (!id || nombre.length < 2 || nombre.length > 80 || !(ROLES as readonly string[]).includes(rol)) redirect("/equipo/usuarios?error=datos");
  const sb = await clienteServidor();
  const { error } = await sb.from("perfiles").update({ nombre, rol, activo }).eq("id", id);
  if (error) {
    console.error("editar usuario:", error.code, error.message);
    redirect(`/equipo/usuarios?error=${error.code === "23514" ? "ultimo_admin" : "guardar"}`);
  }
  revalidatePath("/equipo/usuarios");
  redirect("/equipo/usuarios?ok=1");
}
