"use server";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/servidor";

export async function entrar(formData: FormData) {
  const email = String(formData.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(formData.get("contrasena") ?? "");
  if (!email || !contrasena) redirect("/equipo/login?error=datos");
  const supabase = await clienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: contrasena });
  if (error || !data.user) redirect("/equipo/login?error=datos");
  const { data: perfil } = await supabase.from("perfiles").select("activo").eq("id", data.user.id).maybeSingle();
  if (!perfil?.activo) {
    await supabase.auth.signOut();
    redirect("/equipo/login?error=inactivo");
  }
  redirect("/equipo");
}

export async function salir() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  redirect("/equipo/login");
}
