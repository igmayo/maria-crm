import { redirect } from "next/navigation";
import Link from "next/link";
import { perfilActivo } from "@/lib/sesion";
import { clienteServidor } from "@/lib/supabase/servidor";
import { MAX_FRASE } from "@/lib/perfil";
import { guardarPerfil } from "./acciones";

const errores: Record<string, string> = {
  nombre: "El nombre es obligatorio (hasta 80 caracteres).", frase: `La frase no puede pasar de ${MAX_FRASE} caracteres.`,
  telefono: "El teléfono no parece válido.", foto_tipo: "La foto debe ser JPG, PNG o WebP.", foto_tamano: "La foto pesa más de 5 MB.",
  guardar: "No se ha podido guardar. Inténtalo de nuevo.",
};

export default async function MiPerfil({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { error, ok } = await searchParams;
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const sb = await clienteServidor();
  const { data: p } = await sb.from("perfiles").select("nombre,email,telefono,frase,foto_url").eq("id", perfil.id).maybeSingle();
  if (!p) redirect("/equipo");
  return (
    <main className="modal" style={{ flex: 1 }}>
      <form action={guardarPerfil} className="modal-caja" aria-label="Mi perfil">
        <div><h1>Mi perfil</h1><p className="intro">Así te ven los novios de tus bodas: en “Mi boda”, en el chat y en los correos que reciben.</p></div>
        {ok && <p className="aviso-ok" role="status">Perfil guardado.</p>}
        {error && errores[error] && <p className="error" role="alert">{errores[error]}</p>}
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          {p.foto_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={p.foto_url} alt="Tu foto" width={96} height={96} style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", flex: "none" }} />
            : <span className="av" style={{ width: 96, height: 96, fontSize: 36, background: "#F3AF42", color: "#282828" }}>{p.nombre.slice(0, 1).toUpperCase()}</span>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="campo"><span>Subir foto</span><input className="fi" type="file" name="foto" accept="image/jpeg,image/png,image/webp" /></label>
            {p.foto_url && <label style={{ fontSize: 13 }}><input type="checkbox" name="quitar_foto" value="1" /> Quitar mi foto</label>}
            <span style={{ fontSize: 12, color: "var(--suave)" }}>Una foto tuya, de cara y con buena luz. JPG, PNG o WebP, hasta 5 MB.</span>
          </div>
        </div>
        <label className="campo"><span>Nombre</span><input className="fi" name="nombre" maxLength={80} required defaultValue={p.nombre} /></label>
        <label className="campo"><span>Frase de presentación</span><input className="fi" name="frase" maxLength={MAX_FRASE} defaultValue={p.frase ?? ""} placeholder="Llevo vuestra boda de principio a fin." />
          <span style={{ fontSize: 12, color: "var(--suave)", fontWeight: 400 }}>Una línea corta y cercana. Máximo {MAX_FRASE} caracteres.</span></label>
        <label className="campo"><span>Correo</span><input className="fi" value={p.email} readOnly style={{ background: "#F4F1EA" }} />
          <span style={{ fontSize: 12, color: "var(--suave)", fontWeight: 400 }}>Es el de tu acceso. Si cambia, lo cambia el administrador.</span></label>
        <label className="campo"><span>Teléfono</span><input className="fi" name="telefono" type="tel" maxLength={40} defaultValue={p.telefono ?? ""} /></label>
        <p className="nota">Se publica al guardar. Si algo no debe verse, el administrador puede quitarlo.</p>
        <div className="acciones-form"><Link href="/equipo" className="btn-sec">Cancelar</Link><button className="btn-pri" type="submit">Guardar cambios</button></div>
      </form>
    </main>
  );
}
