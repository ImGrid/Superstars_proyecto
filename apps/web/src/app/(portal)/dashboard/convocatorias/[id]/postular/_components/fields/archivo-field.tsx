"use client";

import { memo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadArchivo, deleteArchivo } from "@/lib/api/archivo.api";
import { archivoQueries } from "@/lib/api/query-keys";
import { mensajeErrorSubida } from "@/lib/api/error-archivo";
import type { FieldRendererProps } from "./field-props";

interface ArchivoFieldProps extends FieldRendererProps {
  convocatoriaId: number;
  postulacionId: number | undefined;
}

export const ArchivoField = memo(function ArchivoField({
  campo,
  form,
  convocatoriaId,
  postulacionId,
}: ArchivoFieldProps) {
  if (campo.tipo !== "archivo") return null;

  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [progreso, setProgreso] = useState(0);

  const { tiposPermitidos, maxTamanoMb, maxArchivos } = campo;

  // cargar archivos existentes para este campo
  const { data: archivos } = useQuery({
    ...archivoQueries.list(convocatoriaId, postulacionId ?? 0),
    enabled: !!postulacionId,
    select: (all) => all.filter((a) => a.fieldId === campo.id),
  });

  const archivosList = archivos ?? [];
  const canUpload = archivosList.length < maxArchivos;

  // subir archivo
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      setProgreso(0);
      return uploadArchivo(
        convocatoriaId,
        postulacionId!,
        campo.id,
        file,
        setProgreso,
      );
    },
    onSuccess: (newArchivo) => {
      queryClient.invalidateQueries({
        queryKey: archivoQueries.list(convocatoriaId, postulacionId!).queryKey,
      });
      // actualizar response_data con el ID del archivo
      const current = (form.getValues(campo.id) as number[]) ?? [];
      form.setValue(campo.id, [...current, newArchivo.id], { shouldDirty: true });
      toast.success("Archivo subido");
    },
    onError: (err: any) => {
      toast.error(
        mensajeErrorSubida(err, "No se pudo subir el archivo. Intenta de nuevo."),
      );
    },
  });

  // eliminar archivo
  const deleteMutation = useMutation({
    mutationFn: (archivoId: number) =>
      deleteArchivo(convocatoriaId, postulacionId!, archivoId),
    onSuccess: (_, archivoId) => {
      queryClient.invalidateQueries({
        queryKey: archivoQueries.list(convocatoriaId, postulacionId!).queryKey,
      });
      // quitar ID del response_data
      const current = (form.getValues(campo.id) as number[]) ?? [];
      form.setValue(
        campo.id,
        current.filter((id) => id !== archivoId),
        { shouldDirty: true },
      );
      toast.success("Archivo eliminado");
    },
    onError: () => toast.error("Error al eliminar archivo"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // limpiar el input para permitir subir el mismo archivo
    if (inputRef.current) inputRef.current.value = "";

    // validar tamanio
    if (file.size > maxTamanoMb * 1024 * 1024) {
      toast.error(`El archivo excede el límite de ${maxTamanoMb} MB`);
      return;
    }

    uploadMutation.mutate(file);
  };

  const isUploading = uploadMutation.isPending;
  const acceptStr = tiposPermitidos.join(",");

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={() => (
        <FormItem>
          <FormLabel>
            {campo.etiqueta}
            {campo.requerido && <span className="text-error-500 ml-1">*</span>}
          </FormLabel>
          {campo.descripcion && (
            <FormDescription>{campo.descripcion}</FormDescription>
          )}

          {/* archivos subidos */}
          {archivosList.length > 0 && (
            <div className="space-y-2">
              {archivosList.map((arch) => (
                <div
                  key={arch.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <FileIcon className="size-4 shrink-0 text-secondary-400" />
                  <span className="flex-1 truncate">{arch.nombreOriginal}</span>
                  <span className="text-xs text-secondary-400">
                    {(arch.tamanoBytes / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(arch.id)}
                  >
                    <X className="size-3.5 text-error-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* boton upload */}
          {!postulacionId ? (
            <p className="text-xs text-secondary-400">
              Guarda el borrador primero para poder subir archivos.
            </p>
          ) : canUpload ? (
            <div>
              <input
                ref={inputRef}
                type="file"
                accept={acceptStr}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {isUploading ? "Subiendo…" : "Subir archivo"}
              </Button>

              {/* avance de la subida: con conexion lenta puede tardar bastante */}
              {isUploading && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <Progress value={progreso} className="h-1.5 flex-1" />
                    <span className="shrink-0 text-xs font-medium text-secondary-600">
                      {progreso}%
                    </span>
                  </div>
                  <p className="text-xs text-secondary-500">
                    {progreso < 100
                      ? "Subiendo el archivo. No cierres esta página."
                      : "Guardando el archivo…"}
                  </p>
                </div>
              )}

              <p className="mt-1 text-xs text-secondary-400">
                Formatos: {tiposPermitidos.join(", ")} | Max: {maxTamanoMb} MB |
                {archivosList.length}/{maxArchivos} archivos
              </p>
            </div>
          ) : (
            <p className="text-xs text-secondary-400">
              Limite de archivos alcanzado ({maxArchivos})
            </p>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
});
