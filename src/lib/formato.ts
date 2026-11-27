const ZONA = "Europe/Madrid";

export function iniciales(nombre: string): string {
  const p = nombre.replace(/[()]/g, " ").split(/\s+(?:y|e)\s+|\s+/).filter((x) => x.length > 1 || /[A-ZÁÉÍÓÚÑ]/.test(x));
  const a = p[0]?.[0] ?? "?";
  const b = p[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function dia(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA }).format(d); // AAAA-MM-DD
}

export function horaMensaje(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Hora si es de hoy, "Ayer", o día/mes. */
export function etiquetaFecha(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  if (dia(d) === dia(ahora)) return horaMensaje(iso);
  if (dia(d) === dia(new Date(ahora.getTime() - 86400000))) return "Ayer";
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "2-digit", month: "2-digit" }).format(d);
}

export function encabezadoDia(iso: string, ahora: Date = new Date()): string {
  const d = new Date(iso);
  if (dia(d) === dia(ahora)) return "Hoy";
  if (dia(d) === dia(new Date(ahora.getTime() - 86400000))) return "Ayer";
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function fechaLarga(fecha: string | null): string {
  if (!fecha) return "Sin fecha";
  const d = new Date(fecha + "T12:00:00Z");
  const t = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(d);
  const sinComa = t.replace(",", "");
  return sinComa.charAt(0).toUpperCase() + sinComa.slice(1);
}

export function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
