import { partirNegritas } from "@/lib/texto";

/** Muestra el texto de un mensaje respetando las negritas, sin inyectar HTML. */
export default function TextoMaria({ texto }: { texto: string }) {
  return <>{partirNegritas(texto).map((t, i) => (t.negrita ? <strong key={i} style={{ fontWeight: 600 }}>{t.texto}</strong> : <span key={i}>{t.texto}</span>))}</>;
}
