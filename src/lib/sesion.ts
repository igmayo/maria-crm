import { clienteServidor } from "@/lib/supabase/servidor";

export interface PerfilSesion { id: string; nombre: string; email: string; rol: string }

/** Devuelve el perfil de quien está conectado, o null si no hay sesión o su cuenta no está activa. */
export async function perfilActivo(): Promise<PerfilSesion | null> {
  const supabase = await clienteServidor();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("perfiles").select("id,nombre,email,rol,activo").eq("id", u.user.id).maybeSingle();
  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol };
}
