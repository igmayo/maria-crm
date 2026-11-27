import { timingSafeEqual } from "node:crypto";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { procesarAvisos } from "@/lib/avisos";
import { urlBase } from "@/lib/usuarios";

export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || secreto.length < 16) return false; // sin secreto configurado, el endpoint está cerrado
  const dado = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secreto}`;
  const a = Buffer.from(dado), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Lo llama un programador externo cada pocos minutos (Vercel Cron, Supabase pg_cron o similar) con `Authorization: Bearer $CRON_SECRET`. */
async function manejar(req: Request) {
  if (!autorizado(req)) return Response.json({ error: "no_autorizado" }, { status: 401 });
  if (!hayClaveDeServicio()) return Response.json({ error: "sin_configurar" }, { status: 503 });
  try {
    return Response.json(await procesarAvisos(clienteAdmin(), { base: urlBase() }), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("avisos:", e instanceof Error ? e.message : "error");
    return Response.json({ error: "interno" }, { status: 500 });
  }
}
export const GET = manejar;
export const POST = manejar;
