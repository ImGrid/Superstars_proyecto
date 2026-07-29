"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUploadZone } from "@/components/shared/image-upload-zone";
import {
  uploadImagenPublicacion,
  removeImagenPublicacion,
  getPublicacionImagenUrl,
} from "@/lib/api/publicacion.api";
import { publicacionQueries } from "@/lib/api/query-keys";
import { mensajeErrorSubida } from "@/lib/api/error-archivo";

interface PublicacionImageUploadProps {
  publicacionId: number;
  imagenDestacadaKey: string | null;
}

// Wrapper que orquesta ImageUploadZone con las mutaciones de publicacion.
// Mantiene la misma firma publica que el componente original para no romper
// los lugares que ya lo importan (publicacion-form.tsx).
export function PublicacionImageUpload({
  publicacionId,
  imagenDestacadaKey,
}: PublicacionImageUploadProps) {
  const queryClient = useQueryClient();

  // Cache busting con la imagenKey para que el navegador refresque la imagen
  // cuando se reemplaza por una nueva (mismo id, archivo distinto).
  const currentImageUrl = imagenDestacadaKey
    ? `${getPublicacionImagenUrl(publicacionId)}?v=${encodeURIComponent(imagenDestacadaKey)}`
    : null;

  function invalidatePublicacionCaches() {
    queryClient.invalidateQueries({
      queryKey: publicacionQueries.detail(publicacionId).queryKey,
    });
    queryClient.invalidateQueries({ queryKey: publicacionQueries.all() });
    // Invalidar las vistas publicas que muestran la portada
    queryClient.invalidateQueries({ queryKey: ["public", "publicaciones"] });
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImagenPublicacion(publicacionId, file),
    onSuccess: () => {
      toast.success("La imagen se guardó correctamente.");
      invalidatePublicacionCaches();
    },
    onError: (error: any) => {
      toast.error(
        mensajeErrorSubida(error, "No se pudo guardar la imagen. Intenta de nuevo."),
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeImagenPublicacion(publicacionId),
    onSuccess: () => {
      toast.success("La imagen se eliminó correctamente.");
      invalidatePublicacionCaches();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ?? "No se pudo eliminar la imagen. Intenta de nuevo.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  return (
    <ImageUploadZone
      currentImageUrl={currentImageUrl}
      onUpload={(file) => uploadMutation.mutate(file)}
      onRemove={() => removeMutation.mutate()}
      isUploading={uploadMutation.isPending}
      isRemoving={removeMutation.isPending}
      // Las publicaciones se muestran con aspecto 16/9 en su listado y detalle
      previewAspectClass="aspect-video"
      removeDialogTitle="Eliminar imagen de portada"
      removeDialogDescription="La publicación quedará sin imagen de portada en el listado público. Podrás subir otra más adelante."
    />
  );
}
