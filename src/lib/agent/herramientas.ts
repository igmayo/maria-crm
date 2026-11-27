import { z } from "zod";
import type { Ambito, Herramienta, Repositorio } from "./tipos";
import { CAMPOS, esCampo, normalizarValor } from "@/lib/cambios";

// Lista de herramientas por ámbito. El permiso se decide AQUÍ, en código, no en el prompt.
const comunes: Herramienta[] = [
  {
    name: "buscar_conocimiento",
    description: "Busca en la base de respuestas aprobadas por el equipo. Úsala antes de responder cualquier pregunta sobre el negocio.",
    input_schema: { type: "object", properties: { consulta: { type: "string" } }, required: ["consulta"] },
  },
  {
    name: "avisar_equipo",
    description: "Avisa al equipo cuando no puedas resolver algo o la persona pida hablar con alguien.",
    input_schema: { type: "object", properties: { motivo: { type: "string" } }, required: ["motivo"] },
  },
  {
    name: "proponer_reunion",
    description: "Registra la preferencia de día y hora para una reunión. El comercial la confirma; tú nunca confirmas.",
    input_schema: { type: "object", properties: { preferencia: { type: "string" } }, required: ["preferencia"] },
  },
];

const soloPublico: Herramienta[] = [
  {
    name: "guardar_lead",
    description: "Guarda los datos de contacto y del evento de una persona nueva interesada.",
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string" }, email: { type: "string" }, telefono: { type: "string" },
        tipoEvento: { type: "string", enum: ["boda", "empresa", "otro"] },
        fecha: { type: "string" }, invitados: { type: "number" }, notas: { type: "string" },
      },
      required: ["nombre", "tipoEvento"],
    },
  },
];

const soloNovios: Herramienta[] = [
  {
    name: "consultar_ficha",
    description: "Lee los datos de la boda de esta pareja (horarios, menú, lugar). No incluye alergias.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "registrar_cambio",
    description: "Registra una petición de cambio para que la valide el comercial. Nunca modifica la ficha. El campo es uno de la lista; si lo que piden no encaja en ninguno, usa 'otro' y descríbelo. Formato del valor: fecha AAAA-MM-DD; horas HH:MM (24 h); adultos y niños, un número; tipo_ceremonia, 'religiosa' o 'civil'; espacio y menu, texto; otro, texto libre.",
    input_schema: { type: "object", properties: { campo: { type: "string", enum: [...CAMPOS] }, valorPedido: { type: "string" } }, required: ["campo", "valorPedido"] },
  },
  {
    name: "crear_pendiente",
    description: "Crea una tarea para el equipo (pregunta sin respuesta, audio o foto recibidos).",
    input_schema: {
      type: "object",
      properties: { tipo: { type: "string", enum: ["pregunta_maria", "audio_foto", "nota"] }, descripcion: { type: "string" } },
      required: ["tipo", "descripcion"],
    },
  },
];

export function herramientasPara(ambito: Ambito): Herramienta[] {
  return ambito.tipo === "publico" ? [...comunes, ...soloPublico] : [...comunes, ...soloNovios];
}

const esquemas = {
  buscar_conocimiento: z.object({ consulta: z.string().min(1).max(300) }),
  avisar_equipo: z.object({ motivo: z.string().min(1).max(500) }),
  proponer_reunion: z.object({ preferencia: z.string().min(1).max(300) }),
  guardar_lead: z.object({
    nombre: z.string().min(1).max(120), email: z.string().email().optional(), telefono: z.string().max(30).optional(),
    tipoEvento: z.enum(["boda", "empresa", "otro"]), fecha: z.string().max(40).optional(),
    invitados: z.number().int().min(0).max(5000).optional(), notas: z.string().max(1000).optional(),
  }),
  consultar_ficha: z.object({}),
  registrar_cambio: z.object({ campo: z.string().min(1).max(80), valorPedido: z.string().min(1).max(1000) }),
  crear_pendiente: z.object({ tipo: z.enum(["pregunta_maria", "audio_foto", "nota"]), descripcion: z.string().min(1).max(500) }),
} as const;

/** Ejecuta una herramienta. Rechaza cualquiera que no pertenezca al ámbito, aunque el modelo la pida. */
export async function ejecutar(ambito: Ambito, repo: Repositorio, nombre: string, entrada: unknown): Promise<string> {
  const permitidas = herramientasPara(ambito).map((h) => h.name);
  if (!permitidas.includes(nombre)) return JSON.stringify({ error: "herramienta_no_permitida" });
  const esquema = esquemas[nombre as keyof typeof esquemas];
  const r = esquema.safeParse(entrada);
  if (!r.success) return JSON.stringify({ error: "datos_no_validos" });
  const d = r.data as never as Record<string, never>;
  switch (nombre) {
    case "buscar_conocimiento": return JSON.stringify(await repo.buscarConocimiento(d.consulta));
    case "avisar_equipo": await repo.avisarEquipo({ motivo: d.motivo }); return JSON.stringify({ ok: true });
    case "proponer_reunion": return JSON.stringify(await repo.proponerReunion({ preferencia: d.preferencia }));
    case "guardar_lead": return JSON.stringify(await repo.guardarLead(d as never));
    case "consultar_ficha": return JSON.stringify(await repo.leerFicha());
    case "registrar_cambio": {
      // El valor se valida aquí, en código: así lo que llega a la comercial se puede aplicar a la ficha sin interpretar texto libre.
      if (!esCampo(d.campo)) return JSON.stringify({ error: "campo_no_valido", campos: CAMPOS });
      const v = normalizarValor(d.campo, d.valorPedido);
      if (!v.ok) return JSON.stringify({ error: "valor_no_valido", ayuda: "Pide el dato de nuevo en el formato indicado en la herramienta, o usa el campo 'otro'." });
      return JSON.stringify(await repo.registrarCambio({ campo: d.campo, valorPedido: String(v.valor) }));
    }
    case "crear_pendiente": return JSON.stringify(await repo.crearPendiente({ tipo: d.tipo as never, descripcion: d.descripcion }));
  }
  return JSON.stringify({ error: "desconocida" });
}
