import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente de Supabase con la sesión de quien navega. Respeta las reglas de acceso (RLS). */
export async function clienteServidor() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (lista) => {
        try { lista.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* en componentes de solo lectura */ }
      },
    },
  });
}
