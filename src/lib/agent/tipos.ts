// Tipos del núcleo del agente. No depende de ningún canal (web hoy, WhatsApp mañana).

export type Ambito =
  | { tipo: "publico" } // chat público: persona desconocida, sin datos de ninguna boda
  | { tipo: "novios"; eventoId: string; conversacionId: string; contactoId: string; nombre: string };

export interface MensajeEntrada {
  texto: string;
  /** Mensajes previos de ESTA conversación, del más antiguo al más reciente. */
  historial: { rol: "usuario" | "asistente"; texto: string }[];
}

/** Lo que el agente puede leer y hacer. Cada función ya viene limitada al ámbito. */
export interface Repositorio {
  buscarConocimiento(consulta: string): Promise<{ pregunta: string; respuesta: string }[]>;
  /** Solo para ámbito novios: datos de la ficha permitidos (nunca alergias ni notas internas). */
  leerFicha(): Promise<Record<string, string>>;
  registrarCambio(c: { campo: string; valorPedido: string }): Promise<{ id: string }>;
  crearPendiente(p: { tipo: "pregunta_maria" | "audio_foto" | "nota"; descripcion: string }): Promise<{ id: string }>;
  guardarLead(l: { nombre: string; email?: string; telefono?: string; tipoEvento: "boda" | "empresa" | "otro"; fecha?: string; invitados?: number; notas?: string }): Promise<{ id: string }>;
  proponerReunion(r: { preferencia: string }): Promise<{ id: string }>;
  avisarEquipo(a: { motivo: string }): Promise<void>;
}

export interface Herramienta {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export interface ClienteLLM {
  crear(p: {
    modelo: string;
    sistema: string;
    mensajes: BloqueMensaje[];
    herramientas: Herramienta[];
  }): Promise<RespuestaLLM>;
}

export type BloqueMensaje = { role: "user" | "assistant"; content: string | unknown[] };
export type BloqueRespuesta =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export interface RespuestaLLM {
  contenido: BloqueRespuesta[];
  parada: string;
  tokensEntrada: number;
  tokensSalida: number;
}

export interface Registro {
  modelo: string;
  versionPrompt: string;
  herramientas: string[];
  tokensEntrada: number;
  tokensSalida: number;
  duracionMs: number;
}
