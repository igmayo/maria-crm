"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clienteServidor } from "@/lib/supabase/servidor";
import { clienteAdmin, hayClaveDeServicio } from "@/lib/supabase/admin";
import { perfilActivo } from "@/lib/sesion";
import { validarPerfil, tipoImagen, MAX_FOTO } from "@/lib/perfil";

/** Cada persona edita solo su perfil: la política perfiles_editar_propio lo impone en la base de datos. */
export async function guardarPerfil(formData: FormData) {
  const perfil = await perfilActivo();
  if (!perfil) redirect("/equipo/login");
  const v = validarPerfil(formData);
  if (!v.ok) redirect(`/equipo/perfil?error=${v.error}`);
  const cambios: Record<string, string | null> = { nombre: v.valores.nombre, frase: v.valores.frase, telefono: v.valores.telefono };

  const archivo = formData.get("foto");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > MAX_FOTO) redirect("/equipo/perfil?error=foto_tamano");
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const tipo = tipoImagen(bytes);
    if (!tipo) redirect("/equipo/perfil?error=foto_tipo");
    if (!hayClaveDeServicio()) redirect("/equipo/perfil?error=guardar");
    const admin = clienteAdmin();
    const ruta = `${perfil.id}/${randomUUID()}.${tipo.ext}`;
    const { error } = await admin.storage.from("fotos-comerciales").upload(ruta, bytes, { contentType: tipo.mime, cacheControl: "31536000" });
    if (error) { console.error("subir foto:", error.message); redirect("/equipo/perfil?error=guardar"); }
    cambios.foto_url = admin.storage.from("fotos-comerciales").getPublicUrl(ruta).data.publicUrl;
  } else if (formData.get("quitar_foto") === "1") {
    cambios.foto_url = null; // el archivo no se borra: solo deja de mostrarse
  }

  const sb = await clienteServidor();
  const { data, error } = await sb.from("perfiles").update(cambios).eq("id", perfil.id).select("id");
  if (error || !data?.length) redirect("/equipo/perfil?error=guardar");
  revalidatePath("/equipo", "layout");
  redirect("/equipo/perfil?ok=1");
}
