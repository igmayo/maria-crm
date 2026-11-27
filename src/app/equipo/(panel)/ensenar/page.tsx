import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { listarConocimiento, listarSinRespuesta } from "@/lib/datos-conocimiento";
import { ETIQUETA_ESTADO, CATEGORIAS } from "@/lib/conocimiento";
import { decidirRespuesta, descartarPregunta } from "./acciones";

type Pestana = "publicadas" | "revisar" | "sin";

export default async function Ensenar({ searchParams }: { searchParams: Promise<{ pestana?: string; ok?: string; error?: string; cat?: string }> }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador" && perfil.rol !== "comercial") redirect("/equipo");
  const admin = perfil.rol === "administrador";
  const { pestana: p, ok, error, cat } = await searchParams;
  const pestana: Pestana = p === "revisar" || p === "sin" ? p : "publicadas";
  const [todas, sinRespuesta] = await Promise.all([listarConocimiento(), listarSinRespuesta()]);
  const publicadas = todas.filter((r) => r.estado === "publicada" && (!cat || r.categoria === cat));
  const porRevisar = todas.filter((r) => r.estado === "propuesta" || (r.estado === "borrador" && r.autorId === perfil.id));
  const pestanas: [Pestana, string, number][] = [["publicadas", "Publicadas", todas.filter((r) => r.estado === "publicada").length], ["revisar", admin ? "Por revisar" : "Mis propuestas", porRevisar.length], ["sin", "Sin respuesta", sinRespuesta.length]];
  return (
    <main className="pagina">
      <header className="pagina-cab" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div><h1>Enseñar a María</h1><p>Lo que María sabe responder. {admin ? "Tú publicas lo que proponen los comerciales." : "Propón respuestas y un administrador las publica."}</p></div>
        <Link href="/equipo/ensenar/nueva" className="btn-pri">+ Nueva respuesta</Link>
      </header>
      {ok && <p className="aviso-ok" role="status">{ok}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <nav className="pestanas" aria-label="Secciones">
        {pestanas.map(([k, t, n]) => <Link key={k} href={`/equipo/ensenar?pestana=${k}`} className={pestana === k ? "pest on" : "pest"} aria-current={pestana === k ? "page" : undefined}>{t} <span className="pest-n">{n}</span></Link>)}
      </nav>

      {pestana === "publicadas" && (
        <>
          <div className="filtros-cat">
            <Link href="/equipo/ensenar?pestana=publicadas" className={!cat ? "chip-f on" : "chip-f"}>Todas</Link>
            {CATEGORIAS.map((c) => <Link key={c} href={`/equipo/ensenar?pestana=publicadas&cat=${encodeURIComponent(c)}`} className={cat === c ? "chip-f on" : "chip-f"}>{c}</Link>)}
          </div>
          <section className="lista-cono">
            {publicadas.length === 0 && <p className="vacio-cono">Todavía no hay respuestas publicadas{cat ? " en esta categoría" : ""}.</p>}
            {publicadas.map((r) => (
              <article key={r.id} className="tarjeta-cono">
                <div className="cono-cab"><span className="bd g">{r.categoria}</span><small>v{r.version}{r.autor ? ` · ${r.autor}` : ""}</small></div>
                <h2>{r.pregunta}</h2>
                <p>{r.respuesta}</p>
                <div className="cono-pie">
                  {admin && <Link href={`/equipo/ensenar/nueva?id=${r.id}`} className="btn-sec">Editar</Link>}
                  {admin && <form action={decidirRespuesta}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="accion" value="retirar" /><button className="btn-sec" type="submit">Retirar</button></form>}
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {pestana === "revisar" && (
        <section className="lista-cono">
          {porRevisar.length === 0 && <p className="vacio-cono">{admin ? "No hay nada pendiente de revisar." : "No tienes propuestas en curso."}</p>}
          {porRevisar.map((r) => {
            const [t, c] = ETIQUETA_ESTADO[r.estado];
            return (
              <article key={r.id} className="tarjeta-cono">
                <div className="cono-cab"><span className={`bd ${c}`}>{t}</span><small>{r.categoria}{r.autor ? ` · ${r.autor}` : ""}</small></div>
                <h2>{r.pregunta}</h2>
                <p>{r.respuesta}</p>
                {r.nota && <p className="nota-dev"><strong>Nota del administrador:</strong> {r.nota}</p>}
                <div className="cono-pie">
                  {(admin || r.autorId === perfil.id) && <Link href={`/equipo/ensenar/nueva?id=${r.id}`} className="btn-sec">Editar</Link>}
                  {admin && r.estado === "propuesta" && (
                    <>
                      <form action={decidirRespuesta}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="accion" value="publicar" /><button className="btn-pri" type="submit">Publicar</button></form>
                      <form action={decidirRespuesta} className="devolver"><input type="hidden" name="id" value={r.id} /><input type="hidden" name="accion" value="devolver" /><input name="nota" placeholder="Nota para devolverla" maxLength={500} aria-label="Nota para el autor" /><button className="btn-sec" type="submit">Devolver</button></form>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {pestana === "sin" && (
        <section className="lista-cono">
          {sinRespuesta.length === 0 && <p className="vacio-cono">María no tiene preguntas sin responder. Buen trabajo.</p>}
          {sinRespuesta.map((q) => (
            <article key={q.clave} className="tarjeta-cono">
              <div className="cono-cab">{q.veces > 1 ? <span className="bd p">{q.veces} veces</span> : <span className="bd gr">1 vez</span>}</div>
              <h2>{q.texto}</h2>
              <div className="cono-pie">
                <Link href={`/equipo/ensenar/nueva?pendiente=${q.ids[0]}`} className="btn-pri">Enseñar respuesta</Link>
                <Link href={`/equipo?r=${q.conversacionId}`} className="btn-sec">Ver conversación</Link>
                <form action={descartarPregunta}><input type="hidden" name="ids" value={q.ids.join(",")} /><button className="btn-sec" type="submit">No es para María</button></form>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
