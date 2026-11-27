"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { perfilActivo } from "@/lib/sesion";
import { validarRespuesta, esUuid, puedeEnsenar, MAX_NOTA } from "@/lib/conocimiento";

const texto = (f: FormData, k: string) => String(f.get(k) ?? "");
const volver = (ruta: string, clave: "ok" | "error", valor: string): never => redirect(`${ruta}${ruta.includes("?") ? "&" : "?"}${clave}=${encodeURIComponent(valor)}`);

/** Guarda una respuesta: como borrador, enviada a revisión o (solo administrador) publicada. Las reglas finales las pone la base de datos. */
export async function guardarRespuesta(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = texto(formData, "id");
  const pendiente = texto(formData, "pendiente");
  const destino = id && esUuid(id) ? `/equipo/ensenar/nueva?id=${id}` : pendiente && esUuid(pendiente) ? `/equipo/ensenar/nueva?pendiente=${pendiente}` : "/equipo/ensenar/nueva";
  if (!puedeEnsenar(perfil.rol)) return volver(destino, "error", "No tienes permiso para enseñar a María.");
  const v = validarRespuesta({ pregunta: texto(formData, "pregunta"), respuesta: texto(formData, "respuesta"), categoria: texto(formData, "categoria") });
  if (!v.ok) return volver(destino, "error", { pregunta: "La pregunta debe tener entre 3 y 300 caracteres.", respuesta: "La respuesta debe tener entre 3 y 1500 caracteres.", categoria: "Elige una categoría." }[v.error]);
  const modo = texto(formData, "modo");
  const esAdmin = perfil.rol === "administrador";
  const estado = modo === "publicar" && esAdmin ? "publicada" : modo === "enviar" ? "propuesta" : "borrador";
  const sb = await clienteServidor();
  const campos = { ...v.valor, estado, nota_revision: null, ...(estado === "publicada" ? { publicado_por: perfil.id } : {}) };
  let idFinal = id;
  if (id && esUuid(id)) {
    const { data, error } = await sb.from("conocimiento").update(campos).eq("id", id).select("id");
    if (error || !data?.length) return volver(destino, "error", "No se ha podido guardar. Puede que ya esté publicada o no sea tuya.");
  } else {
    const { data, error } = await sb.from("conocimiento").insert({ ...campos, autor_id: perfil.id }).select("id").single();
    if (error || !data) { console.error("conocimiento:", error?.message); return volver(destino, "error", "No se ha podido guardar. Inténtalo de nuevo."); }
    idFinal = data.id;
  }
  // Si venía de una pregunta sin respuesta, queda marcada como enseñada (no se borra).
  if (pendiente && esUuid(pendiente)) await sb.from("pendientes").update({ ensenado_en: new Date().toISOString(), ensenado_como: "ensenada" }).eq("id", pendiente);
  revalidatePath("/equipo/ensenar");
  const msg = estado === "publicada" ? "Publicada. María ya puede usarla." : estado === "propuesta" ? "Enviada a revisión. Un administrador la publicará." : "Guardada como borrador.";
  return volver(estado === "borrador" ? `/equipo/ensenar/nueva?id=${idFinal}` : "/equipo/ensenar?pestana=" + (estado === "publicada" ? "publicadas" : "revisar"), "ok", msg);
}

/** Acciones de administrador sobre una respuesta ya enviada: publicar, devolver con nota o retirar. */
export async function decidirRespuesta(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const id = texto(formData, "id");
  const accion = texto(formData, "accion");
  const base = "/equipo/ensenar?pestana=" + (accion === "retirar" ? "publicadas" : "revisar");
  if (perfil.rol !== "administrador") return volver(base, "error", "Solo los administradores pueden hacerlo.");
  if (!esUuid(id)) return volver(base, "error", "Respuesta no válida.");
  const sb = await clienteServidor();
  let cambios: Record<string, unknown>;
  let mensaje: string;
  if (accion === "publicar") { cambios = { estado: "publicada", publicado_por: perfil.id, nota_revision: null }; mensaje = "Publicada. María ya puede usarla."; }
  else if (accion === "devolver") {
    const nota = texto(formData, "nota").trim();
    if (nota.length < 3 || nota.length > MAX_NOTA) return volver(base, "error", `Escribe una nota para el autor (3 a ${MAX_NOTA} caracteres).`);
    cambios = { estado: "borrador", nota_revision: nota }; mensaje = "Devuelta al autor con tu nota.";
  } else if (accion === "retirar") { cambios = { estado: "borrador", publicado_por: null }; mensaje = "Retirada: María deja de usarla. Queda como borrador."; }
  else return volver(base, "error", "Acción no válida.");
  const { data, error } = await sb.from("conocimiento").update(cambios).eq("id", id).select("id");
  if (error || !data?.length) return volver(base, "error", "No se ha podido completar.");
  revalidatePath("/equipo/ensenar");
  return volver(base, "ok", mensaje);
}

/** "No es para María": la pregunta sale de la lista pero no se borra. */
export async function descartarPregunta(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const ids = texto(formData, "ids").split(",").filter(esUuid);
  const base = "/equipo/ensenar?pestana=sin";
  if (!ids.length) return volver(base, "error", "Pregunta no válida.");
  const sb = await clienteServidor();
  const { data } = await sb.from("pendientes").update({ ensenado_en: new Date().toISOString(), ensenado_como: "descartada" }).in("id", ids).select("id");
  revalidatePath("/equipo/ensenar");
  return volver(base, data?.length ? "ok" : "error", data?.length ? "Descartada. Ya no aparece en la lista." : "No tienes permiso sobre esa pregunta.");
}
