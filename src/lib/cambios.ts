/** Cambios que piden los novios (D45). María solo puede pedir cambios sobre estos campos; el resto va como "otro". */
import { fechaLarga } from "@/lib/formato";
import { ETIQUETA_CEREMONIA } from "@/lib/ficha";

export const CAMPOS = ["fecha", "espacio", "tipo_ceremonia", "hora_ceremonia", "hora_banquete", "adultos", "ninos", "menu", "otro"] as const;
export type CampoCambio = (typeof CAMPOS)[number];

export const ETIQUETA_CAMPO: Record<CampoCambio, string> = {
  fecha: "Fecha", espacio: "Espacio", tipo_ceremonia: "Tipo de ceremonia", hora_ceremonia: "Hora de la ceremonia",
  hora_banquete: "Hora del banquete", adultos: "Adultos", ninos: "Niños", menu: "Menú", otro: "Otro",
};
/** Columna de la tabla eventos que cambia al aprobar. "otro" no se aplica solo. */
export const COLUMNA: Record<Exclude<CampoCambio, "otro">, string> = {
  fecha: "fecha", espacio: "lugar", tipo_ceremonia: "tipo_ceremonia", hora_ceremonia: "hora_ceremonia", hora_banquete: "hora_banquete",
  adultos: "adultos", ninos: "ninos", menu: "menu",
};

export function esCampo(c: unknown): c is CampoCambio { return typeof c === "string" && (CAMPOS as readonly string[]).includes(c); }

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Valida y normaliza el valor pedido según el campo. Si no es válido, quien pide el cambio debe darlo en otro formato (o usar "otro"). */
export function normalizarValor(campo: CampoCambio, texto: string): { ok: true; valor: string | number } | { ok: false } {
  const t = texto.replace(/\s+/g, " ").trim();
  if (!t) return { ok: false };
  switch (campo) {
    case "fecha": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { ok: false };
      const d = new Date(`${t}T12:00:00Z`);
      return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t ? { ok: false } : { ok: true, valor: t };
    }
    case "hora_ceremonia": case "hora_banquete": return HORA.test(t) ? { ok: true, valor: t } : { ok: false };
    case "adultos": case "ninos": return /^\d{1,4}$/.test(t) ? { ok: true, valor: Number(t) } : { ok: false };
    case "tipo_ceremonia": { const v = t.toLowerCase(); return v === "religiosa" || v === "civil" ? { ok: true, valor: v } : { ok: false }; }
    case "espacio": return t.length <= 120 ? { ok: true, valor: t } : { ok: false };
    case "menu": return t.length <= 1000 ? { ok: true, valor: t } : { ok: false };
    case "otro": return t.length <= 500 ? { ok: true, valor: t } : { ok: false };
  }
}

/** Cómo se enseña un valor a las personas (equipo y novios). */
export function mostrarValor(campo: string, valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "Sin indicar";
  const v = String(valor);
  if (campo === "fecha") return fechaLarga(v);
  if (campo === "hora_ceremonia" || campo === "hora_banquete") return v.slice(0, 5);
  if (campo === "tipo_ceremonia") return ETIQUETA_CEREMONIA[v as keyof typeof ETIQUETA_CEREMONIA] ?? v;
  return v;
}

export interface EventoFicha {
  fecha: string | null; lugar: string | null; tipo_ceremonia: string | null; hora_ceremonia: string | null; hora_banquete: string | null;
  adultos: number | null; ninos: number | null; menu: string | null;
}
export function valorActual(campo: CampoCambio, e: EventoFicha): string | number | null {
  if (campo === "otro") return null;
  return (e as unknown as Record<string, string | number | null>)[COLUMNA[campo]] ?? null;
}

export const TEXTO_APROBADO = "Cambio aprobado.";
export const TEXTO_RECHAZADO = "No ha sido posible este cambio.";
export const ESTADO_NOVIOS: Record<string, string> = { pendiente: "En revisión", aprobada: "Aprobado", rechazada: "No ha sido posible" };
