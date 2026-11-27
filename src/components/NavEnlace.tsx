"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Enlace del menú lateral que se marca solo cuando estás en esa sección. */
export default function NavEnlace({ seccion, children }: { seccion: "bandeja" | "usuarios" | "ensenar"; children: React.ReactNode }) {
  const ruta = usePathname();
  const enUsuarios = ruta === "/equipo/usuarios" || ruta.startsWith("/equipo/usuarios/");
  const enEnsenar = ruta === "/equipo/ensenar" || ruta.startsWith("/equipo/ensenar/");
  const on = seccion === "usuarios" ? enUsuarios : seccion === "ensenar" ? enEnsenar : !enUsuarios && !enEnsenar;
  const href = seccion === "usuarios" ? "/equipo/usuarios" : seccion === "ensenar" ? "/equipo/ensenar" : "/equipo";
  return <Link href={href} className={on ? "nv on" : "nv"} aria-current={on ? "page" : undefined}>{children}</Link>;
}
