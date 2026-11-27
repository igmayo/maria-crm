"use server";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";
import { contrasenaValida } from "@/lib/usuarios";

/** Crea la contraseña de quien llega con un enlace de invitación (o de un reenvío). El token se consume aquí, no al abrir la página. */
export async function crearContrasena(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const tipo = String(formData.get("type") ?? "");
  const a = String(formData.get("contrasena") ?? "");
  const b = String(formData.get("repetir") ?? "");
  const destino = tokenHash ? `/equipo/invitacion?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(tipo)}` : "/equipo/invitacion";
  const valida = contrasenaValida(a, b);
  if (valida !== "ok") redirect(`${destino}${destino.includes("?") ? "&" : "?"}error=${valida}`);
  const sb = await clienteServidor();
  if (tokenHash) {
    if (tipo !== "invite" && tipo !== "recovery") redirect("/equipo/invitacion?error=enlace");
    const { error } = await sb.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (error) redirect("/equipo/invitacion?error=enlace");
  }
  const { data: u } = await sb.auth.getUser();
  if (!u.user) redirect("/equipo/invitacion?error=enlace");
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) { console.error("crear contraseña:", error.message); redirect("/equipo/invitacion?error=guardar"); }
  const { data: perfil } = await sb.from("perfiles").select("activo").eq("id", u.user.id).maybeSingle();
  if (!perfil?.activo) { await sb.auth.signOut(); redirect("/equipo/login?error=inactivo"); }
  redirect("/equipo");
}
