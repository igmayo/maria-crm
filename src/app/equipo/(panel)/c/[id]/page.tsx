import VistaBandeja from "@/components/VistaBandeja";
import type { Filtro } from "@/lib/datos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTROS = ["todas", "te_toca", "mias", "sin_asignar"];

export default async function Conversacion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string; q?: string; r?: string; error?: string }> }) {
  const { id } = await params;
  const { f, q, r, error } = await searchParams;
  return <VistaBandeja filtro={(FILTROS.includes(f ?? "") ? f : "todas") as Filtro} q={q ?? ""} seleccionada={id} error={error} r={UUID.test(r ?? "") ? r : undefined} />;
}
