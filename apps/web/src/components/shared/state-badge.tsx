import { Badge } from "@/components/ui/badge";
import { getEstadoConfig } from "@/lib/estado-labels";

interface StateBadgeProps {
  tipo: "concurso" | "postulacion" | "publicacion" | "calificacion" | "rol";
  valor: string;
}

export function StateBadge({ tipo, valor }: StateBadgeProps) {
  const config = getEstadoConfig(tipo, valor);

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
