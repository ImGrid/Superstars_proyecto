import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// skeleton del dashboard mientras carga la data del backend
// imita la estructura final: header + 4 KPIs + 2 secciones grandes
export function DashboardSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* KPIs */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${kpiCount}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: kpiCount }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-5">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* lista pendientes */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* gráfico */}
      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-4 h-5 w-48" />
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
