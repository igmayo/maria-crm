/** Reglas de la ficha de boda: validación del formulario y textos para mostrarla. Sin acceso a la base de datos. */
export const TIPOS_EVENTO = ["boda", "empresa", "otro"] as const;
export const ESTADOS_EVENTO = ["lead", "reunion", "cliente", "cerrado", "perdido"] as const;
export const ORIGENES = ["Chat web", "Correo", "Teléfono", "Feria", "Otro"] as const;
export const CEREMONIAS = ["religiosa", "civil"] as const;

export const ETIQUETA_ESTADO: Record<string, string> = { lead: "Lead", reunion: "Reunión", cliente: "Cliente", cerrado: "Cerrado", perdido: "Perdido" };
export const COLOR_ESTADO: Record<string, string> = { lead: "p", reunion: "bl", cliente: "g", cerrado: "gr", perdido: "gr" };
export const ETIQUETA_CEREMONIA: Record<string, string> = { religiosa: "Religiosa", civil: "Civil" };

export interface Titular { nombre: string; telefono: string | null; email: string | null }
export interface ValoresFicha {
  tipo: (typeof TIPOS_EVENTO)[number]; estado: (typeof ESTADOS_EVENTO)[number]; origen: string | null;
  fecha: string | null; lugar: string | null; tipo_ceremonia: string | null;
  hora_ceremonia: string | null; hora_banquete: string | null;
  adultos: number | null; ninos: number | null; invitados: number | null;
  menu: string | null; dato_interes: string | null;
  titular1: Titular; titular2: Titular | null;
}
export type ResultadoFicha = { ok: true; valores: ValoresFicha } | { ok: false; error: "titular1" | "fecha" | "hora" | "numero" | "opcion" | "correo" };

const hora = /^([01]\d|2[0-3]):[0-5]\d$/;
const correo = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texto(v: FormDataEntryValue | null, max: number): string | null {
  const t = String(v ?? "").trim().replace(/[ \t]+/g, " ");
  return t ? t.slice(0, max) : null;
}
function entero(v: FormDataEntryValue | null): number | null | "mal" {
  const t = String(v ?? "").trim();
  if (!t) return null;
  if (!/^\d{1,4}$/.test(t)) return "mal";
  return Number(t);
}

export function validarFicha(f: { get(k: string): FormDataEntryValue | null }): ResultadoFicha {
  const tipo = String(f.get("tipo") ?? "");
  const estado = String(f.get("estado") ?? "");
  if (!(TIPOS_EVENTO as readonly string[]).includes(tipo) || !(ESTADOS_EVENTO as readonly string[]).includes(estado)) return { ok: false, error: "opcion" };
  const cer = String(f.get("tipo_ceremonia") ?? "");
  if (cer && !(CEREMONIAS as readonly string[]).includes(cer)) return { ok: false, error: "opcion" };
  const fecha = String(f.get("fecha") ?? "").trim();
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha + "T12:00:00Z")))) return { ok: false, error: "fecha" };
  const hc = String(f.get("hora_ceremonia") ?? "").trim();
  const hb = String(f.get("hora_banquete") ?? "").trim();
  if ((hc && !hora.test(hc)) || (hb && !hora.test(hb))) return { ok: false, error: "hora" };
  const adultos = entero(f.get("adultos"));
  const ninos = entero(f.get("ninos"));
  if (adultos === "mal" || ninos === "mal") return { ok: false, error: "numero" };
  const n1 = texto(f.get("nombre1"), 80);
  if (!n1) return { ok: false, error: "titular1" };
  const c1 = texto(f.get("correo1"), 200)?.toLowerCase() ?? null;
  const n2 = texto(f.get("nombre2"), 80);
  const c2 = n2 ? texto(f.get("correo2"), 200)?.toLowerCase() ?? null : null;
  if ((c1 && !correo.test(c1)) || (c2 && !correo.test(c2))) return { ok: false, error: "correo" };
  const origen = texto(f.get("origen"), 40);
  return {
    ok: true,
    valores: {
      tipo: tipo as ValoresFicha["tipo"], estado: estado as ValoresFicha["estado"], origen,
      fecha: fecha || null, lugar: texto(f.get("lugar"), 120), tipo_ceremonia: cer || null,
      hora_ceremonia: hc || null, hora_banquete: hb || null,
      adultos, ninos, invitados: adultos === null && ninos === null ? null : (adultos ?? 0) + (ninos ?? 0),
      menu: texto(f.get("menu"), 1000), dato_interes: texto(f.get("dato_interes"), 2000),
      titular1: { nombre: n1, telefono: texto(f.get("telefono1"), 40), email: c1 },
      titular2: n2 ? { nombre: n2, telefono: texto(f.get("telefono2"), 40), email: c2 } : null,
    },
  };
}

/** "120 adultos · 8 niños". Si solo hay total (lead del chat), "120 invitados". */
export function textoInvitados(e: { adultos: number | null; ninos: number | null; invitados: number | null }): string {
  const partes: string[] = [];
  if (e.adultos !== null) partes.push(`${e.adultos} adultos`);
  if (e.ninos !== null) partes.push(`${e.ninos} niños`);
  if (partes.length) return partes.join(" · ");
  return e.invitados !== null ? `${e.invitados} invitados` : "Sin indicar";
}

export function textoHorarios(e: { hora_ceremonia: string | null; hora_banquete: string | null }): string {
  const h = (t: string | null) => (t ? t.slice(0, 5) : null);
  const partes = [h(e.hora_ceremonia) && `Ceremonia ${h(e.hora_ceremonia)}`, h(e.hora_banquete) && `banquete ${h(e.hora_banquete)}`].filter(Boolean) as string[];
  const s = partes.join(" · ");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Sin indicar";
}
