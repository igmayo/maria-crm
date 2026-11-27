import type { ContenidoCorreo } from "@/lib/plantilla-correo";

/** Los enlaces de los novios se cierran solos 30 días después de la boda (decisión D38). */
export const DIAS_TRAS_BODA = 30;

/** Fin del último día de acceso, a partir de la fecha de la boda (AAAA-MM-DD). */
export function caducaEn(fecha: string): Date {
  const d = new Date(`${fecha}T23:59:59Z`);
  d.setUTCDate(d.getUTCDate() + DIAS_TRAS_BODA);
  return d;
}

export function enlaceNovios(base: string, token: string): string {
  return `${base}/boda/${encodeURIComponent(token)}`;
}

export function contenidoEnlaceNovios(nombre: string, comercial: string | null, enlace: string): { asunto: string; contenido: ContenidoCorreo } {
  return {
    asunto: "Vuestro acceso personal a vuestra boda con Guadalquivir Catering",
    contenido: {
      resumen: "Aquí tenéis vuestro enlace personal para ver los datos de vuestra boda.",
      titulo: `Hola, ${nombre}`,
      parrafos: [
        `${comercial ? `${comercial}, vuestra comercial,` : "Vuestro equipo"} ha creado vuestro acceso personal para ver los datos de vuestra boda con Guadalquivir Catering. No necesitáis usuario ni contraseña.`,
        "Es un enlace personal: no lo compartáis con nadie.",
      ],
      boton: { texto: "Entrar a mi boda", url: enlace },
      notas: ["El acceso se cierra solo un tiempo después de la boda. Si perdéis este correo, podéis pedir el enlace de nuevo a vuestra comercial."],
    },
  };
}
