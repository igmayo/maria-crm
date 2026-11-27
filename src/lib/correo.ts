/** Envío de correo con Resend. Solo servidor. La clave sale del entorno y nunca se imprime ni se registra. */
export interface Correo { para: string; asunto: string; texto: string; html?: string; responderA?: string }

/** El nombre que ve quien recibe el correo es siempre el de la empresa. Del RESEND_FROM solo se usa la dirección. */
export function remitente(de: string, nombre = "Guadalquivir Catering"): string {
  const m = de.match(/<([^>]+)>/);
  const direccion = (m ? m[1] : de).trim();
  return `${nombre} <${direccion}>`;
}

export function correoConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

/** Devuelve true si Resend aceptó el correo. Si falta configuración o falla, false (quien llama decide qué hacer). */
export async function enviarCorreo(c: Correo, enviar: typeof fetch = fetch): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  const de = process.env.RESEND_FROM;
  if (!clave || !de) return false;
  try {
    const r = await enviar("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente(de), to: [c.para], subject: c.asunto, text: c.texto,
        ...(c.html ? { html: c.html } : {}), ...(c.responderA ? { reply_to: c.responderA } : {}),
      }),
    });
    if (!r.ok) { console.error("correo: Resend respondió", r.status); return false; }
    return true;
  } catch {
    console.error("correo: no se pudo contactar con Resend");
    return false;
  }
}
