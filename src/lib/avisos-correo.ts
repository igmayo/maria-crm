import type { ContenidoCorreo } from "@/lib/plantilla-correo";

export interface Persona { nombre: string; frase: string | null; foto: string | null }

/** Aviso a los titulares (D40). No lleva el texto de la respuesta: la ven al entrar con su enlace personal. */
export function avisoNovios(nombre: string, comercial: Persona | null, n: number, enlace: string): { asunto: string; contenido: ContenidoCorreo } {
  const quien = comercial?.nombre ?? "Vuestro equipo";
  const uno = n <= 1;
  return {
    asunto: uno ? `${quien} ha contestado a vuestro mensaje` : `Tenéis ${n} respuestas nuevas de vuestra boda`,
    contenido: {
      resumen: uno ? "Tenéis una respuesta nueva en el chat de vuestra boda." : `Tenéis ${n} respuestas nuevas en el chat de vuestra boda.`,
      titulo: uno ? `${quien} ha contestado a vuestro mensaje` : `Tenéis ${n} respuestas nuevas`,
      parrafos: [
        `Hola, ${nombre}.`,
        uno ? "Os han respondido en el chat de vuestra boda. Podéis leerlo cuando queráis." : "Os han respondido en el chat de vuestra boda. Están esperando allí.",
      ],
      persona: comercial ?? undefined,
      boton: { texto: uno ? "Ver respuesta" : "Ver respuestas", url: enlace },
      notas: ["Este botón es vuestro enlace personal: no lo compartáis."],
    },
  };
}

/** Aviso al equipo cuando hace falta una persona. */
export function avisoEquipo(destino: string, novios: string, motivo: string | null, enlace: string, fecha: string | null): { asunto: string; contenido: ContenidoCorreo } {
  return {
    asunto: `${novios} necesitan una respuesta`,
    contenido: {
      resumen: `${novios} esperan a una persona del equipo.`,
      titulo: `${novios} necesitan una respuesta`,
      parrafos: [`Hola, ${destino}.`, motivo ? `Motivo: ${motivo}` : "Han escrito en el chat y hace falta que responda una persona del equipo."],
      boton: { texto: "Abrir la conversación", url: enlace },
      notas: fecha ? [`Boda del ${fecha}.`] : [],
    },
  };
}

/** Recordatorios: 4 horas a la responsable, 24 horas también a los administradores. Siempre en horas naturales. */
export function recordatorio(plazo: 4 | 24, destino: string, novios: string, responsable: string | null, enlace: string, esAdmin: boolean): { asunto: string; contenido: ContenidoCorreo } {
  const cuerpo = plazo === 4
    ? `${novios} llevan 4 horas sin respuesta en su conversación.`
    : `La conversación de ${novios}${responsable ? ` (responsable: ${responsable})` : ""} lleva 24 horas esperando respuesta.${esAdmin ? " Puedes abrirla o reasignarla." : ""}`;
  return {
    asunto: plazo === 4 ? `Recordatorio: ${novios} siguen esperando` : `Conversación sin atender: ${novios}${responsable ? `, boda de ${responsable}` : ""}`,
    contenido: {
      resumen: cuerpo,
      titulo: plazo === 4 ? "Siguen esperando respuesta" : "Una conversación lleva 24 horas sin respuesta",
      parrafos: [`Hola, ${destino}.`, cuerpo],
      boton: { texto: "Abrir la conversación", url: enlace },
      notas: plazo === 4 ? ["Si no se contesta en 24 horas, se avisará también a un administrador."] : [],
    },
  };
}
