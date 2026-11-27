import { EMPRESA } from "@/lib/empresa";

/** Contenido de un correo, sin maquetar. Un mismo contenido da la versión HTML y la de texto plano. */
export interface ContenidoCorreo {
  /** Línea que muestran las bandejas de entrada junto al asunto. */
  resumen: string;
  titulo: string;
  parrafos: string[];
  boton?: { texto: string; url: string };
  /** Texto pequeño bajo el botón. */
  notas?: string[];
  /** Por qué recibe el correo. Va en el pie. */
  motivo: string;
}

const AMBAR = "#F3AF42", TEXTO = "#282828", SUAVE = "#5E5A52", BORDE = "#E8E2D6", FONDO = "#FAF8F4", ENLACE = "#6B4200";
const FUENTE = "'Montserrat', Arial, Helvetica, sans-serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** El logo solo se pone si la dirección de la app es pública (https): en local el correo no podría cargarlo. */
function cabecera(base: string): string {
  const logo = base.startsWith("https://")
    ? `<img src="${esc(base)}/logo-guadalquivir.png" alt="${esc(EMPRESA.nombre)}" width="180" style="display:block;border:0;height:auto;max-width:180px">`
    : `<span style="font-size:20px;font-weight:600;color:${TEXTO}">${esc(EMPRESA.nombre)}</span>`;
  return `<tr><td style="padding:24px 32px 16px;border-bottom:3px solid ${AMBAR};font-family:${FUENTE}">${logo}</td></tr>`;
}

export function correoHtml(c: ContenidoCorreo, base: string): string {
  const parrafos = c.parrafos.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${TEXTO}">${esc(p)}</p>`).join("");
  const boton = c.boton
    ? `<p style="margin:8px 0 22px"><a href="${esc(c.boton.url)}" style="display:inline-block;background:${AMBAR};color:${TEXTO};font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:28px">${esc(c.boton.texto)}</a></p>`
    : "";
  const notas = (c.notas ?? []).map((n) => `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${SUAVE}">${esc(n)}</p>`).join("");
  const alterno = c.boton
    ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:${SUAVE}">Si el botón no funciona, copia esta dirección en el navegador:</p><p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${ENLACE};word-break:break-all">${esc(c.boton.url)}</p>`
    : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.titulo)}</title></head>
<body style="margin:0;padding:0;background:${FONDO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(c.resumen)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border:1px solid ${BORDE};border-radius:12px;overflow:hidden">
${cabecera(base)}
<tr><td style="padding:28px 32px 12px;font-family:${FUENTE}"><h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;font-weight:600;color:${TEXTO}">${esc(c.titulo)}</h1>${parrafos}${boton}${notas}${alterno}</td></tr>
<tr><td style="padding:16px 32px 22px;background:${FONDO};border-top:1px solid ${BORDE};font-family:${FUENTE};font-size:12px;line-height:1.6;color:${SUAVE}">
<strong style="color:${TEXTO}">${esc(EMPRESA.razonSocial)}</strong><br>${esc(EMPRESA.direccion)}<br>${EMPRESA.telefonos.map(esc).join(" · ")} · <a href="${esc(EMPRESA.web)}" style="color:${ENLACE}">${esc(EMPRESA.web.replace("https://", ""))}</a>
<p style="margin:8px 0 0">${esc(c.motivo)}</p></td></tr>
</table></td></tr></table></body></html>`;
}

export function correoTexto(c: ContenidoCorreo): string {
  return [
    c.titulo, "", ...c.parrafos.flatMap((p) => [p, ""]),
    ...(c.boton ? [`${c.boton.texto}:`, c.boton.url, ""] : []),
    ...(c.notas ?? []).flatMap((n) => [n]),
    "", "--", EMPRESA.razonSocial, EMPRESA.direccion, `${EMPRESA.telefonos.join(" · ")} · ${EMPRESA.web}`, "", c.motivo,
  ].join("\n");
}
