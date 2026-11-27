"use client";
import { useEffect } from "react";

/** Mantiene la altura de la pantalla de chat igual a la parte visible (sin teclado), para que el campo de texto no se vaya al abrir el teclado en el móvil. */
export default function AltoVisible() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const raiz = document.documentElement;
    const ajustar = () => {
      raiz.style.setProperty("--alto-vis", `${Math.round(vv.height)}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0); // iOS desplaza la página al abrir el teclado
    };
    ajustar();
    vv.addEventListener("resize", ajustar);
    vv.addEventListener("scroll", ajustar);
    return () => { vv.removeEventListener("resize", ajustar); vv.removeEventListener("scroll", ajustar); raiz.style.removeProperty("--alto-vis"); };
  }, []);
  return null;
}
