// Mini base de datos en memoria con la parte de la API de Supabase que usan los avisos. Prueba la lógica, no PostgREST.
type Fila = Record<string, unknown>;
export function falsoSupabase(tablas: Record<string, Fila[]>) {
  let n = 0;
  function consulta(tabla: string) {
    let op: "select" | "insert" | "update" = "select";
    let valores: Fila = {};
    const filtros: ((f: Fila) => boolean)[] = [];
    let orden: { c: string; asc: boolean } | null = null;
    let tope = Infinity;
    const filas = () => {
      let r = (tablas[tabla] ??= []).filter((f) => filtros.every((x) => x(f)));
      if (orden) r = [...r].sort((a, b) => (String(a[orden!.c] ?? "") < String(b[orden!.c] ?? "") ? -1 : 1) * (orden!.asc ? 1 : -1));
      return r.slice(0, tope);
    };
    const ejecutar = (): { data: unknown; error: { message: string } | null } => {
      if (op === "insert") {
        const f: Fila = { id: `id${++n}`, creado_en: new Date().toISOString(), enviado_en: null, descartado_en: null, ...valores };
        const unico = tabla === "avisos" && String(f.tipo).startsWith("recordatorio") && (tablas.avisos ?? []).some((a) => a.conversacion_id === f.conversacion_id && a.tipo === f.tipo && a.mensaje_id === f.mensaje_id);
        if (unico) return { data: null, error: { message: "duplicado" } };
        (tablas[tabla] ??= []).push(f);
        return { data: [f], error: null };
      }
      if (op === "update") { const r = filas(); r.forEach((f) => Object.assign(f, valores)); return { data: r, error: null }; }
      return { data: filas(), error: null };
    };
    const q: Record<string, unknown> = {
      select: () => q, insert: (v: Fila) => { op = "insert"; valores = v; return q; }, update: (v: Fila) => { op = "update"; valores = v; return q; },
      eq: (c: string, v: unknown) => { filtros.push((f) => f[c] === v); return q; },
      neq: (c: string, v: unknown) => { filtros.push((f) => f[c] !== v); return q; },
      gt: (c: string, v: string) => { filtros.push((f) => String(f[c]) > v); return q; },
      gte: (c: string, v: string) => { filtros.push((f) => String(f[c]) >= v); return q; },
      is: (c: string, v: unknown) => { filtros.push((f) => (f[c] ?? null) === v); return q; },
      in: (c: string, v: unknown[]) => { filtros.push((f) => v.includes(f[c])); return q; },
      order: (c: string, o?: { ascending?: boolean }) => { orden = { c, asc: o?.ascending !== false }; return q; },
      limit: (k: number) => { tope = k; return q; },
      maybeSingle: async () => { const r = ejecutar(); return { data: (r.data as Fila[])[0] ?? null, error: r.error }; },
      single: async () => { const r = ejecutar(); return { data: (r.data as Fila[])[0] ?? null, error: r.error }; },
      then: (res: (v: unknown) => unknown) => Promise.resolve(ejecutar()).then(res),
    };
    return q;
  }
  return { from: consulta, tablas } as never as import("@supabase/supabase-js").SupabaseClient & { tablas: typeof tablas };
}
