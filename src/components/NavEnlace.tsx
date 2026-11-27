"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Enlace del menú lateral que se marca solo cuando estás en esa sección. */
export default function NavEnlace({ seccion, children }: { seccion: "bandeja" | "usuarios"; children: React.ReactNode }) {
  const ruta = usePathname();
  const enUsuarios = ruta === "/equipo/usuarios" || ruta.startsWith("/equipo/usuarios/");
  const on = seccion === "usuarios" ? enUsuarios : !enUsuarios;
  return <Link href={seccion === "usuarios" ? "/equipo/usuarios" : "/equipo"} className={on ? "nv on" : "nv"} aria-current={on ? "page" : undefined}>{children}</Link>;
}
