"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudUpload, ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  uploadImagenPublicacion,
  removeImagenPublicacion,
} from "@/lib/api/publicacion.api";
import { publicacionQueries } from "@/lib/api/query-keys";

// tipos de imagen permitidos
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface PublicacionImageUploadProps {
  publicacionId: number;
  imagenDestacadaKey: string | null;
}

export function PublicacionImageUpload({
  publicacionId,
  imagenDestacadaKey,
}: PublicacionImageUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadImagenPublicacion(publicacionId, file),
    onSuccess: () => {
      toast.success("Imagen subida correctamente");
      queryClient.invalidateQueries({
        queryKey: publicacionQueries.detail(publicacionId).queryKey,
      });
      setPreview(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al subir la imagen";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setPreview(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeImagenPublicacion(publicacionId),
    onSuccess: () => {
      toast.success("Imagen eliminada correctamente");
      queryClient.invalidateQueries({
        queryKey: publicacionQueries.detail(publicacionId).queryKey,
      });
      setRemoveOpen(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar la imagen";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setRemoveOpen(false);
    },
  });

  function validateAndUpload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imagenes JPEG, PNG o WebP");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no debe superar 5 MB");
      return;
    }
    // preview local
    const url = URL.createObjectURL(file);
    setPreview(url);
    uploadMutation.mutate(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) validateAndUpload(file);
    },
    [],
  );

  // si hay imagen existente o preview local
  const hasImage = imagenDestacadaKey || preview;

  // construir URL de la imagen para preview
  const imageUrl = preview
    ? preview
    : imagenDestacadaKey
      ? `${process.env.NEXT_PUBLIC_API_URL}/publicaciones/${publicacionId}/imagen`
      : null;

  return (
    <div className="space-y-2">
      {hasImage ? (
        // preview de imagen actual
        <div className="relative overflow-hidden rounded-lg border border-secondary-200">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Imagen de portada"
              className="h-40 w-full object-cover"
            />
          )}
          {uploadMutation.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
          {!uploadMutation.isPending && (
            <div className="absolute right-2 top-2 flex gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-7"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-7"
                onClick={() => setRemoveOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        // dropzone
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              fileInputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-primary-500 bg-primary-50"
              : "border-secondary-300 hover:border-primary-400 hover:bg-secondary-50"
          }`}
        >
          <CloudUpload
            className={`size-8 ${isDragging ? "text-primary-500" : "text-secondary-400"}`}
          />
          <p className="text-xs font-medium text-secondary-700">
            Arrastra una imagen o haz click
          </p>
          <p className="text-xs text-secondary-400">
            JPEG, PNG o WebP (max 5 MB)
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Eliminar imagen"
        description="Se eliminara la imagen de portada de esta publicacion."
        confirmLabel="Eliminar"
        onConfirm={() => removeMutation.mutate()}
        isLoading={removeMutation.isPending}
      />
    </div>
  );
}
