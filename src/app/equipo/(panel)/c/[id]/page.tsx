import VistaBandeja from "@/components/VistaBandeja";
import type { Filtro } from "@/lib/datos";

const FILTROS = ["todas", "te_toca", "mias", "sin_asignar"];

export default async function Conversacion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; q?: string; error?: string }> }) {
  const { id } = await params;
  const { f, q, error } = await searchParams;
  return <VistaBandeja filtro={(FILTROS.includes(f ?? "") ? f : "todas") as Filtro} q={q ?? ""} seleccionada={id} error={error} />;
}
