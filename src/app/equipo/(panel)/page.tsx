import VistaBandeja from "@/components/VistaBandeja";
import type { Filtro } from "@/lib/datos";

const FILTROS = ["todas", "te_toca", "mias", "sin_asignar"];

export default async function Bandeja({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f, q } = await searchParams;
  return <VistaBandeja filtro={(FILTROS.includes(f ?? "") ? f : "todas") as Filtro} q={q ?? ""} />;
}
