"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { HistoriaExitoResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { historiaExitoQueries } from "@/lib/api/query-keys";
import { reorderHistoriasExito } from "@/lib/api/historia-exito.api";
import { HistoriaCard } from "./_components/historia-card";
import { HistoriaFormDialog } from "./_components/historia-form-dialog";

const MAX_ACTIVAS = 6;

export default function HistoriasExitoPage() {
  const [createOpen, setCreateOpen] = useState(false);
  // estado local del orden de activas (para drag-and-drop responsivo)
  const [activasOrden, setActivasOrden] = useState<HistoriaExitoResponse[]>([]);

  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(historiaExitoQueries.list({ limit: 50 }));

  // sensores de dnd-kit: requiere mover 6px para iniciar el drag (evita conflicto con clicks)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // sincronizar el orden local cuando llega data del servidor
  useEffect(() => {
    if (!data) return;
    setActivasOrden(data.data.filter((h) => h.activa));
  }, [data]);

  const inactivas = data?.data.filter((h) => !h.activa) ?? [];

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => reorderHistoriasExito(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: historiaExitoQueries.all() });
      queryClient.invalidateQueries({ queryKey: ["public", "historias-exito"] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al reordenar.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      // rollback al estado del servidor
      if (data) setActivasOrden(data.data.filter((h) => h.activa));
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activasOrden.findIndex((h) => h.id === active.id);
    const newIndex = activasOrden.findIndex((h) => h.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(activasOrden, oldIndex, newIndex);
    setActivasOrden(reordered);
    reorderMutation.mutate(reordered.map((h) => h.id));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Historias de éxito"
        description='Las historias activas aparecen en la sección "Historias que inspiran" de la página de inicio.'
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nueva historia
          </Button>
        }
      />

      {/* loading */}
      {isLoading && <CardSkeleton count={3} />}

      {/* contenido */}
      {!isLoading && data && (
        <>
          {/* sección ACTIVAS */}
          <section className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-semibold text-primary-800">
                Activas en el sitio
              </h2>
              <p className="text-sm text-secondary-500">
                {activasOrden.length} de {MAX_ACTIVAS} usadas. Arrástralas para cambiar el orden.
              </p>
            </div>

            {activasOrden.length === 0 ? (
              <EmptyState
                icon="ph:sparkle-duotone"
                title="No hay historias visibles en el sitio web"
                description="Crea o activa al menos una historia para que aparezca en la página de inicio."
                action={
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Nueva historia
                  </Button>
                }
              />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={activasOrden.map((h) => h.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activasOrden.map((h) => (
                      <HistoriaCard key={h.id} historia={h} draggable />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {/* sección INACTIVAS (solo si hay alguna) */}
          {inactivas.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-secondary-700">
                  Inactivas
                </h2>
                <p className="text-sm text-secondary-500">
                  Estas historias están guardadas pero no se muestran en el sitio web. Puedes activarlas cuando quieras.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inactivas.map((h) => (
                  <HistoriaCard key={h.id} historia={h} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <HistoriaFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
