import { createClient } from "@supabase/supabase-js";

/** Cliente con la clave de servicio: se salta las reglas de acceso. SOLO en código de servidor y nunca con datos de otras conversaciones. */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new Error("Falta la configuración de Supabase en el servidor");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function hayClaveDeServicio(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
