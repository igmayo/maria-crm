import VistaBandeja from "@/components/VistaBandeja";
import type { Filtro } from "@/lib/datos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTROS = ["todas", "te_toca", "mias", "sin_asignar"];

export default async function Bandeja({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; r?: string }> }) {
  const { f, q, r } = await searchParams;
  return <VistaBandeja filtro={(FILTROS.includes(f ?? "") ? f : "todas") as Filtro} q={q ?? ""} r={UUID.test(r ?? "") ? r : undefined} />;
}
