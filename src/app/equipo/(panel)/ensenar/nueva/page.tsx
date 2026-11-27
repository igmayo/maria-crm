import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { cargarRespuesta } from "@/lib/datos-conocimiento";
import { clienteServidor } from "@/lib/supabase/servidor";
import { CATEGORIAS, MAX_PREGUNTA, MAX_RESPUESTA, esUuid } from "@/lib/conocimiento";
import { guardarRespuesta } from "../acciones";

export default async function NuevaRespuesta({ searchParams }: { searchParams: Promise<{ id?: string; pendiente?: string; ok?: string; error?: string }> }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador" && perfil.rol !== "comercial") redirect("/equipo");
  const admin = perfil.rol === "administrador";
  const { id, pendiente, ok, error } = await searchParams;
  const existente = id && esUuid(id) ? await cargarRespuesta(id) : null;
  let pregunta = existente?.pregunta ?? "";
  if (!existente && pendiente && esUuid(pendiente)) {
    const sb = await clienteServidor();
    const { data } = await sb.from("pendientes").select("descripcion").eq("id", pendiente).maybeSingle();
    pregunta = (data?.descripcion ?? "").slice(0, MAX_PREGUNTA);
  }
  const editable = !existente || admin || (existente.autorId === perfil.id && existente.estado !== "publicada");
  return (
    <main className="pagina">
      <header className="pagina-cab"><h1>{existente ? "Editar respuesta" : "Enseñar a María"}</h1><p>Escribe la respuesta como la diría el equipo: clara y sin precios ni pagos. María la usará tal cual.</p></header>
      {ok && <p className="aviso-ok" role="status">{ok}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {existente?.nota && <p className="nota-dev"><strong>Nota del administrador:</strong> {existente.nota}</p>}
      {!editable ? <p className="vacio-cono">Esta respuesta ya está publicada. Pide a un administrador que la edite.</p> : (
        <form action={guardarRespuesta} className="form-cono">
          {existente && <input type="hidden" name="id" value={existente.id} />}
          {!existente && pendiente && esUuid(pendiente) && <input type="hidden" name="pendiente" value={pendiente} />}
          <label>Categoría
            <select name="categoria" defaultValue={existente?.categoria ?? CATEGORIAS[0]}>
              {[...new Set([...(existente ? [existente.categoria] : []), ...CATEGORIAS])].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Pregunta del cliente
            <input name="pregunta" defaultValue={pregunta} maxLength={MAX_PREGUNTA} required placeholder="¿Hacéis menú para celíacos?" />
          </label>
          <label>Respuesta de María
            <textarea name="respuesta" defaultValue={existente?.respuesta ?? ""} maxLength={MAX_RESPUESTA} rows={7} required placeholder="Sí. Podemos adaptar el menú..." />
          </label>
          <div className="cono-pie">
            {admin && <button className="btn-pri" type="submit" name="modo" value="publicar">Publicar</button>}
            {!admin && <button className="btn-pri" type="submit" name="modo" value="enviar">Enviar a revisión</button>}
            {admin && <button className="btn-sec" type="submit" name="modo" value="enviar">Dejar por revisar</button>}
            <button className="btn-sec" type="submit" name="modo" value="borrador">Guardar borrador</button>
            <Link href="/equipo/ensenar" className="btn-sec">Cancelar</Link>
          </div>
        </form>
      )}
    </main>
  );
}
