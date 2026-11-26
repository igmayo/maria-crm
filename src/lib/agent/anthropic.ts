import Anthropic from "@anthropic-ai/sdk";
import type { BloqueRespuesta, ClienteLLM } from "./tipos";

/** Adaptador real. El resto del código solo conoce ClienteLLM, así que se puede cambiar de proveedor. */
export function clienteAnthropic(apiKey: string): ClienteLLM {
  const c = new Anthropic({ apiKey });
  return {
    async crear(p) {
      const r = await c.messages.create({
        model: p.modelo, max_tokens: 800, system: p.sistema,
        messages: p.mensajes as never, tools: p.herramientas as never,
      });
      return {
        contenido: r.content.flatMap((b): BloqueRespuesta[] =>
          b.type === "text" ? [{ type: "text", text: b.text }]
          : b.type === "tool_use" ? [{ type: "tool_use", id: b.id, name: b.name, input: b.input as Record<string, unknown> }]
          : []),
        parada: r.stop_reason ?? "",
        tokensEntrada: r.usage.input_tokens, tokensSalida: r.usage.output_tokens,
      };
    },
  };
}
