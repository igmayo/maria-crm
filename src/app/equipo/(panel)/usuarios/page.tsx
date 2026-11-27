import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { listarUsuarios } from "@/lib/datos";
import { ROLES, ETIQUETA_ROL, estadoUsuario } from "@/lib/usuarios";
import { iniciales } from "@/lib/formato";
import { editarUsuario } from "./acciones";
import FormularioInvitar from "@/components/FormularioInvitar";
import BotonReenviar from "@/components/BotonReenviar";

const errores: Record<string, string> = {
  ultimo_admin: "Debe quedar al menos un administrador activo. Nombra antes a otro administrador.",
  guardar: "No se ha podido guardar el cambio. Inténtalo de nuevo.",
  datos: "Revisa el nombre y el rol.",
  permiso: "Solo los administradores pueden cambiar usuarios.",
};
const estadoTexto = { activo: ["Activo", "g"], invitado: ["Invitación enviada", "p"], desactivado: ["Desactivado", "gr"] } as const;

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  if (perfil.rol !== "administrador") redirect("/equipo");
  const { ok, error } = await searchParams;
  const usuarios = await listarUsuarios();
  return (
    <main className="pagina">
      <header className="pagina-cab">
        <h1>Usuarios</h1>
        <p>Solo los administradores dan de alta, desactivan y cambian roles.</p>
      </header>
      {ok && <p className="aviso-ok" role="status">Cambio guardado.</p>}
      {error && errores[error] && <p className="error" role="alert">{errores[error]}</p>}
      <section className="tabla" aria-label="Lista de usuarios">
        <div className="tabla-cab"><span>Persona</span><span>Rol</span><span>Ve</span><span>Estado</span><span /></div>
        {usuarios.map((u) => {
          const [t, c] = estadoTexto[estadoUsuario(u.activo, u.ultimoAcceso)];
          const ve = !u.activo ? "Nada" : u.rol === "administrador" ? "Todas" : u.rol === "comercial" ? `${u.conversaciones} conversaciones` : "Solo compartidas";
          const huerfanas = u.conversaciones > 0 && (!u.activo || u.rol !== "comercial");
          return (
            <div key={u.id} className="tabla-fila">
              <div className="persona"><span className="av">{iniciales(u.nombre)}</span><div><strong>{u.nombre}</strong><small>{u.email}</small></div></div>
              <span>{ETIQUETA_ROL[u.rol] ?? u.rol}</span>
              <span>{ve}</span>
              <span><span className={`bd ${c}`}>{t}</span></span>
              <div className="acciones-fila">
                {estadoUsuario(u.activo, u.ultimoAcceso) === "invitado" && <BotonReenviar id={u.id} />}
                <details>
                  <summary className="btn-sec">Editar</summary>
                  <form action={editarUsuario} className="editar">
                    <input type="hidden" name="usuario" value={u.id} />
                    <label className="campo"><span>Nombre</span><input className="fi" name="nombre" defaultValue={u.nombre} required maxLength={80} /></label>
                    <label className="campo"><span>Rol</span>
                      <select className="fi" name="rol" defaultValue={u.rol}>{ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}</select></label>
                    <label className="campo"><span>Estado</span>
                      <select className="fi" name="activo" defaultValue={u.activo ? "si" : "no"}><option value="si">Activo</option><option value="no">Desactivado</option></select></label>
                    <button className="btn-pri" type="submit">Guardar</button>
                  </form>
                </details>
              </div>
              {huerfanas && (
                <p className="aviso-fila" role="note">
                  Tiene {u.conversaciones} conversaciones abiertas a su nombre y {u.activo ? "ya no es comercial" : "está desactivado"}.{" "}
                  <Link href={`/equipo?r=${u.id}`}>Ver y reasignar</Link>
                </p>
              )}
            </div>
          );
        })}
      </section>
      <FormularioInvitar />
      <section className="roles" aria-label="Qué ve cada rol">
        <h2>Qué ve cada rol</h2>
        <p><strong>Administrador:</strong> todo, usuarios y copias.</p>
        <p><strong>Comercial:</strong> sus conversaciones, y las que le compartan.</p>
        <p><strong>Diseño, Almacén, Administración:</strong> solo lo que les comparta un responsable o un administrador.</p>
      </section>
      <section className="roles" aria-label="Copias de seguridad">
        <h2>Copias de seguridad</h2>
        <p>Pendiente de configurar. Cuando estén activas (decisión D23), aquí se verá la última copia.</p>
      </section>
    </main>
  );
}
