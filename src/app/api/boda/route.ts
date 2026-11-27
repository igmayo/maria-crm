import { procesarMensajeNovios, cargarChatNovios } from "@/lib/novios/servicio";
import { almacenNovios } from "@/lib/novios/almacen-supabase";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { clienteAnthropic } from "@/lib/agent";
import { procesarAvisos } from "@/lib/avisos";
import { urlBase } from "@/lib/usuarios";

export const runtime = "nodejs";
export const maxDuration = 60;

function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get("origin");
  if (!origen) return true;
  try { return new URL(origen).host === req.headers.get("host"); } catch { return false; }
}
const respuesta = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status, headers: { "Cache-Control": "no-store" } });
// El enlace personal viaja en una cabecera, no en la dirección: así no queda en los registros de acceso.
const tokenDe = (req: Request) => { const t = req.headers.get("x-boda-token") ?? ""; return t.length > 0 && t.length <= 100 ? t : null; };

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return respuesta({ error: "origen" }, 403);
  if (!hayClaveDeServicio()) return respuesta({ error: "sin_configurar" }, 503);
  const token = tokenDe(req);
  if (!token) return respuesta({ error: "enlace" }, 401);
  const cuerpo = (await req.json().catch(() => null)) as { mensaje?: unknown } | null;
  const texto = typeof cuerpo?.mensaje === "string" ? cuerpo.mensaje : "";
  const clave = process.env.ANTHROPIC_API_KEY;
  const sb = clienteAdmin();
  try {
    const r = await procesarMensajeNovios({ almacen: almacenNovios(sb), llm: clave ? clienteAnthropic(clave) : null, modelo: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", token, texto });
    // Si hace falta una persona, el correo al equipo sale ya; los recordatorios los genera el proceso periódico.
    await procesarAvisos(sb, { base: urlBase(), recordatorios: false }).catch((e) => console.error("avisos:", e instanceof Error ? e.message : "error"));
    return respuesta(r, r.error === "vacio" ? 400 : r.error === "enlace" ? 401 : r.error === "limite" ? 429 : 200);
  } catch (e) {
    console.error("chat novios:", e instanceof Error ? e.message : "error");
    return respuesta({ error: "interno" }, 500);
  }
}

export async function GET(req: Request) {
  if (!hayClaveDeServicio()) return respuesta({ mensajes: [] });
  const token = tokenDe(req);
  if (!token) return respuesta({ error: "enlace" }, 401);
  try {
    const m = await cargarChatNovios(almacenNovios(clienteAdmin()), token);
    return m ? respuesta({ mensajes: m }) : respuesta({ error: "enlace" }, 401);
  } catch {
    return respuesta({ mensajes: [] });
  }
}
