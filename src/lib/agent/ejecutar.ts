import { herramientasPara, ejecutar } from "./herramientas";
import { promptSistema, VERSION_PROMPT } from "./prompt";
import type { Ambito, BloqueMensaje, ClienteLLM, MensajeEntrada, Registro, Repositorio } from "./tipos";

const MAX_VUELTAS = 5;
const MAX_TEXTO = 2000;
const RESPUESTA_FALLO = "Ahora mismo no puedo ayudarte con eso. He avisado al equipo y te responderán en horario de oficina.";

export interface Resultado { respuesta: string; registro: Registro }

export async function ejecutarAgente(args: {
  ambito: Ambito; repo: Repositorio; llm: ClienteLLM; modelo: string; entrada: MensajeEntrada; estado?: string;
}): Promise<Resultado> {
  const { ambito, repo, llm, modelo, entrada, estado } = args;
  const inicio = Date.now();
  const usadas: string[] = [];
  let tin = 0, tout = 0;

  const mensajes: BloqueMensaje[] = [
    ...entrada.historial.map((m) => ({ role: (m.rol === "usuario" ? "user" : "assistant") as "user" | "assistant", content: m.texto })),
    { role: "user", content: entrada.texto.slice(0, MAX_TEXTO) },
  ];
  const herramientas = herramientasPara(ambito);
  const sistema = promptSistema(ambito) + (estado ? `\n\nEstado de la conversación (datos reales del sistema):\n${estado}` : "");
  let respuesta = "";

  try {
    for (let i = 0; i < MAX_VUELTAS; i++) {
      const r = await llm.crear({ modelo, sistema, mensajes, herramientas });
      tin += r.tokensEntrada; tout += r.tokensSalida;
      const usos = r.contenido.filter((b) => b.type === "tool_use") as Extract<(typeof r.contenido)[number], { type: "tool_use" }>[];
      const texto = r.contenido.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
      if (usos.length === 0) { respuesta = texto; break; }
      mensajes.push({ role: "assistant", content: r.contenido });
      const resultados = [];
      for (const u of usos) {
        usadas.push(u.name);
        let salida: string;
        try { salida = await ejecutar(ambito, repo, u.name, u.input); } catch { salida = JSON.stringify({ error: "fallo_interno" }); }
        resultados.push({ type: "tool_result", tool_use_id: u.id, content: salida });
      }
      mensajes.push({ role: "user", content: resultados });
    }
  } catch {
    respuesta = "";
  }
  if (!respuesta) {
    respuesta = RESPUESTA_FALLO;
    try { await repo.avisarEquipo({ motivo: "María no pudo responder" }); } catch { /* sin más */ }
  }
  return { respuesta, registro: { modelo, versionPrompt: VERSION_PROMPT, herramientas: usadas, tokensEntrada: tin, tokensSalida: tout, duracionMs: Date.now() - inicio } };
}
