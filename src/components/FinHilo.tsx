"use client";
import { useEffect, useRef } from "react";

/** Al abrir la conversación o llegar un mensaje nuevo, deja a la vista el final del hilo (justo encima del redactor). */
export default function FinHilo({ total }: { total: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: "end" }); }, [total]);
  return <div ref={ref} aria-hidden="true" />;
}
