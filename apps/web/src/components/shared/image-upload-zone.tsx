"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { CloudUpload, Loader2, Trash2, X, RefreshCw } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./confirm-dialog";
import { cn } from "@/lib/utils";
import {
  IMAGE_INPUT_ACCEPT,
  MAX_IMAGE_SIZE_MB,
  validateImageFile,
  getImageDimensionWarning,
  type ImageDimensionWarning,
} from "@/lib/image-validation";

export interface ImageUploadZoneProps {
  // URL absoluta de la imagen guardada en el servidor (si existe).
  // El componente la muestra como src de <img>.
  currentImageUrl?: string | null;
  // Llamado cuando el usuario confirma que quiere subir el archivo seleccionado.
  onUpload: (file: File) => void;
  // Llamado al confirmar la eliminacion. Si no se pasa, no se muestra el boton.
  onRemove?: () => void;
  // El padre indica si una operacion esta en curso para mostrar spinners
  // y bloquear interacciones.
  isUploading?: boolean;
  isRemoving?: boolean;
  // Aspect ratio del preview (mismo que tendra la imagen en su uso real).
  // Por defecto 16/6 que es la proporcion del banner de la convocatoria.
  previewAspectClass?: string;
  // Texto del titulo de la confirmacion al eliminar
  removeDialogTitle?: string;
  removeDialogDescription?: string;
}

export function ImageUploadZone({
  currentImageUrl,
  onUpload,
  onRemove,
  isUploading = false,
  isRemoving = false,
  previewAspectClass = "aspect-[16/6]",
  removeDialogTitle = "Eliminar imagen",
  removeDialogDescription = "Se quitará la imagen actual. Esta acción no se puede deshacer.",
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [pendingWarning, setPendingWarning] = useState<ImageDimensionWarning | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  // Liberar el blob URL anterior cuando cambia o al desmontar
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  // Cuando termina un upload (isUploading pasa true -> false), limpiar el pending
  // para que la UI vuelva al estado "imagen actual" con la nueva imagen ya guardada.
  // Si hubo error el padre mostrara toast y el usuario debera arrastrar otra imagen.
  const wasUploadingRef = useRef(false);
  useEffect(() => {
    if (wasUploadingRef.current && !isUploading) {
      cancelPending();
    }
    wasUploadingRef.current = isUploading;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading]);

  const validateAndPreview = useCallback(
    (file: File) => {
      const error = validateImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }

      // Limpiar preview anterior si lo habia
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);

      const url = URL.createObjectURL(file);
      setPendingFile(file);
      setPendingPreviewUrl(url);
      setPendingWarning(null);

      // Detectar dimensiones reales del archivo para advertir si la proporcion no es ideal
      const img = new window.Image();
      img.onload = () => {
        setPendingWarning(getImageDimensionWarning(img.naturalWidth, img.naturalHeight));
      };
      img.src = url;
    },
    [pendingPreviewUrl],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndPreview(file);
    // Reset del input para que el mismo archivo pueda volver a seleccionarse
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
      if (file) validateAndPreview(file);
    },
    [validateAndPreview],
  );

  function confirmUpload() {
    if (pendingFile) onUpload(pendingFile);
  }

  function cancelPending() {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setPendingWarning(null);
  }

  const isBusy = isUploading || isRemoving;

  // Caso 1: el usuario selecciono un archivo y aun no confirmo. Mostrar preview con warning y botones de accion.
  if (pendingFile && pendingPreviewUrl) {
    return (
      <div className="space-y-3">
        <div className={cn("relative overflow-hidden rounded-lg border border-secondary-200", previewAspectClass)}>
          <img
            src={pendingPreviewUrl}
            alt="Vista previa de la nueva imagen"
            className="h-full w-full object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm font-medium">Subiendo imagen...</span>
              </div>
            </div>
          )}
        </div>

        {pendingWarning && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
              pendingWarning.level === "danger"
                ? "border-error-200 bg-error-50 text-error-700"
                : "border-warning-200 bg-warning-50 text-warning-700",
            )}
          >
            <Icon
              icon={
                pendingWarning.level === "danger"
                  ? "ph:warning-octagon-duotone"
                  : "ph:warning-circle-duotone"
              }
              className="mt-0.5 size-4 shrink-0"
            />
            <span>{pendingWarning.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={cancelPending}
            disabled={isBusy}
          >
            <X className="size-4" />
            Cancelar
          </Button>
          <Button type="button" onClick={confirmUpload} disabled={isBusy}>
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CloudUpload className="size-4" />
            )}
            Guardar esta imagen
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={IMAGE_INPUT_ACCEPT}
          onChange={handleFileChange}
        />
      </div>
    );
  }

  // Caso 2: ya hay una imagen guardada en el servidor. Mostrar preview con botones cambiar/eliminar.
  if (currentImageUrl) {
    return (
      <div className="space-y-3">
        <div className={cn("relative overflow-hidden rounded-lg border border-secondary-200", previewAspectClass)}>
          <img
            src={currentImageUrl}
            alt="Imagen actual"
            className="h-full w-full object-cover"
          />
          {isRemoving && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-2 text-white">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm font-medium">Eliminando...</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
          >
            <RefreshCw className="size-4" />
            Cambiar imagen
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setRemoveOpen(true)}
              disabled={isBusy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={IMAGE_INPUT_ACCEPT}
          onChange={handleFileChange}
        />

        {onRemove && (
          <ConfirmDialog
            open={removeOpen}
            onOpenChange={setRemoveOpen}
            title={removeDialogTitle}
            description={removeDialogDescription}
            confirmLabel="Eliminar"
            onConfirm={() => {
              setRemoveOpen(false);
              onRemove();
            }}
            isLoading={isRemoving}
          />
        )}
      </div>
    );
  }

  // Caso 3: no hay imagen ni pending. Mostrar dropzone vacio.
  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary-500 bg-primary-50"
            : "border-secondary-300 hover:border-primary-400 hover:bg-secondary-50",
        )}
      >
        <CloudUpload
          className={cn(
            "size-10",
            isDragging ? "text-primary-500" : "text-secondary-400",
          )}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-secondary-700">
            Arrastra una imagen aquí o haz clic para elegirla
          </p>
          <p className="text-xs text-secondary-500">
            Recomendado: imagen horizontal de al menos 1200 píxeles de ancho.
          </p>
          <p className="text-xs text-secondary-400">
            Acepta JPEG, PNG o WebP de hasta {MAX_IMAGE_SIZE_MB} MB.
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
      />
    </div>
  );
}
