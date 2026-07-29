"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUploadZone } from "@/components/shared/image-upload-zone";
import {
  uploadImagenConvocatoria,
  removeImagenConvocatoria,
  getConvocatoriaImagenUrl,
} from "@/lib/api/convocatoria.api";
import { convocatoriaQueries, publicQueries } from "@/lib/api/query-keys";
import { mensajeErrorSubida } from "@/lib/api/error-archivo";

interface ConvocatoriaImagenCardProps {
  convocatoriaId: number;
  imagenKey: string | null;
}

// Card del tab General del detalle de convocatoria. El responsable o administrador
// sube, cambia o elimina la imagen de portada. La imagen se ve en el listado y
// detalle publicos.
export function ConvocatoriaImagenCard({
  convocatoriaId,
  imagenKey,
}: ConvocatoriaImagenCardProps) {
  const queryClient = useQueryClient();

  // Cuando hay imagenKey, la URL al backend se genera con el id de la convocatoria.
  // Agregamos el imagenKey como query string para forzar refresco del cache del
  // navegador cuando la imagen cambia (mismo id pero archivo distinto).
  const currentImageUrl = imagenKey
    ? `${getConvocatoriaImagenUrl(convocatoriaId)}?v=${encodeURIComponent(imagenKey)}`
    : null;

  function invalidateConvocatoriaCaches() {
    // Detalle del admin/responsable
    queryClient.invalidateQueries({
      queryKey: convocatoriaQueries.detail(convocatoriaId).queryKey,
    });
    // Listado del admin/responsable (puede mostrar miniaturas en el futuro)
    queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
    // Vistas publicas (listado y detalle) que muestran la imagen
    queryClient.invalidateQueries({ queryKey: ["public", "convocatorias"] });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImagenConvocatoria(convocatoriaId, file),
    onSuccess: () => {
      toast.success("La imagen se guardó correctamente.");
      invalidateConvocatoriaCaches();
    },
    onError: (error: any) => {
      toast.error(
        mensajeErrorSubida(error, "No se pudo guardar la imagen. Intenta de nuevo."),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeImagenConvocatoria(convocatoriaId),
    onSuccess: () => {
      toast.success("La imagen se eliminó correctamente.");
      invalidateConvocatoriaCaches();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? "No se pudo eliminar la imagen. Intenta de nuevo.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Imagen de portada</CardTitle>
        <CardDescription>
          Esta imagen aparecerá en el listado y en la página de detalle de la convocatoria
          que ven los visitantes. Puedes cambiarla o quitarla en cualquier momento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ImageUploadZone
          currentImageUrl={currentImageUrl}
          onUpload={(file) => uploadMutation.mutate(file)}
          onRemove={() => removeMutation.mutate()}
          isUploading={uploadMutation.isPending}
          isRemoving={removeMutation.isPending}
          previewAspectClass="aspect-[16/6]"
          removeDialogTitle="Eliminar imagen de portada"
          removeDialogDescription="La convocatoria volverá a mostrarse con el ícono predeterminado en el listado público. Podrás subir otra imagen más adelante."
        />
      </CardContent>
    </Card>
  );
}
