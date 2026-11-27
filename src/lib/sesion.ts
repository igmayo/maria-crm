import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/servidor";

export interface PerfilSesion { id: string; nombre: string; email: string; rol: string; foto: string | null }

/** Devuelve el perfil de quien está conectado, o null si no hay sesión o su cuenta no está activa. */
export const perfilActivo = cache(async function perfilActivo(): Promise<PerfilSesion | null> {
  const supabase = await clienteServidor();
  // getClaims comprueba la firma de la sesión en local (el middleware ya la ha validado y renovado en esta petición): evita una llamada de red por página.
  const { data: c } = await supabase.auth.getClaims();
  const uid = c?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase.from("perfiles").select("id,nombre,email,rol,activo,foto_url").eq("id", uid).maybeSingle();
  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol, foto: data.foto_url };
});
