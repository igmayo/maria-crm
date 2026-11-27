import { procesarMensaje, cargarHistorial } from "@/lib/chat/servicio";
import { almacenSupabase } from "@/lib/chat/almacen-supabase";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { clienteAnthropic } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get("origin");
  if (!origen) return true;
  try { return new URL(origen).host === req.headers.get("host"); } catch { return false; }
}

const respuesta = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return respuesta({ error: "origen" }, 403);
  if (!hayClaveDeServicio()) return respuesta({ error: "sin_configurar" }, 503);
  const cuerpo = (await req.json().catch(() => null)) as { mensaje?: unknown; token?: unknown } | null;
  const texto = typeof cuerpo?.mensaje === "string" ? cuerpo.mensaje : "";
  const token = typeof cuerpo?.token === "string" && cuerpo.token.length <= 100 ? cuerpo.token : undefined;
  const clave = process.env.ANTHROPIC_API_KEY;
  try {
    const r = await procesarMensaje({
      almacen: almacenSupabase(clienteAdmin()), llm: clave ? clienteAnthropic(clave) : null,
      modelo: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", token, texto,
    });
    return respuesta(r, r.error === "vacio" ? 400 : r.error === "ocupado" ? 429 : 200);
  } catch (e) {
    console.error("chat público:", e instanceof Error ? e.message : "error");
    return respuesta({ error: "interno" }, 500);
  }
}

export async function GET(req: Request) {
  if (!hayClaveDeServicio()) return respuesta({ mensajes: [] });
  const token = req.headers.get("x-chat-token") ?? "";
  if (!token || token.length > 100) return respuesta({ mensajes: [] });
  try {
    const h = await cargarHistorial(almacenSupabase(clienteAdmin()), token);
    return respuesta({ mensajes: h ?? [] });
  } catch {
    return respuesta({ mensajes: [] });
  }
}
