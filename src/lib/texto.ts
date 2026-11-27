export interface Trozo { texto: string; negrita: boolean }

/** Separa un texto en trozos normales y en negrita (**así**). No genera HTML: solo trozos de texto. */
export function partirNegritas(entrada: string): Trozo[] {
  const trozos: Trozo[] = [];
  const re = /\*\*([^*\n][^*]*?)\*\*/g;
  let ultimo = 0;
  for (const m of entrada.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > ultimo) trozos.push({ texto: entrada.slice(ultimo, i), negrita: false });
    trozos.push({ texto: m[1], negrita: true });
    ultimo = i + m[0].length;
  }
  if (ultimo < entrada.length) trozos.push({ texto: entrada.slice(ultimo), negrita: false });
  return trozos.length ? trozos : [{ texto: entrada, negrita: false }];
}
