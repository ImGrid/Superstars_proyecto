"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  createHistoriaExitoSchema,
  type HistoriaExitoResponse,
} from "@superstars/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createHistoriaExito,
  updateHistoriaExito,
  cambiarImagenHistoriaExito,
} from "@/lib/api/historia-exito.api";
import { historiaExitoQueries } from "@/lib/api/query-keys";
import { IMAGE_INPUT_ACCEPT, validateImageFile } from "@/lib/image-validation";
import { EmpresaCombobox } from "./empresa-combobox";

// schema del formulario: extiende el del backend agregando reglas de UX
const formSchema = createHistoriaExitoSchema;
type FormValues = z.infer<typeof formSchema>;

interface HistoriaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historia?: HistoriaExitoResponse;
}

export function HistoriaFormDialog({
  open,
  onOpenChange,
  historia,
}: HistoriaFormDialogProps) {
  const isEditing = !!historia;
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      badge: null,
      descripcion: "",
      empresaId: null,
      empresaNombre: null,
    },
  });

  // imagen: en modo crear es archivo nuevo; en modo editar puede cambiar
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // resetear cuando se abre/cierra o cambia la historia
  useEffect(() => {
    if (!open) return;
    if (historia) {
      form.reset({
        titulo: historia.titulo,
        badge: historia.badge,
        descripcion: historia.descripcion,
        empresaId: historia.empresaId,
        empresaNombre: historia.empresaNombre,
      });
    } else {
      form.reset({
        titulo: "",
        badge: null,
        descripcion: "",
        empresaId: null,
        empresaNombre: null,
      });
    }
    // limpiar preview de archivo nuevo al abrir/cerrar
    setImagenFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [open, historia, form]);

  // limpiar preview al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function validateAndSetFile(file: File) {
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    setImagenFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function clearImagen() {
    setImagenFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  }, []);

  // mutacion crear (envia campos + imagen en multipart)
  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      if (!imagenFile) {
        throw new Error("Falta la imagen");
      }
      return createHistoriaExito(values, imagenFile);
    },
    onSuccess: (created) => {
      toast.success(
        created.activa
          ? "Historia creada correctamente."
          : "Historia creada como inactiva (ya tienes 6 activas).",
      );
      queryClient.invalidateQueries({ queryKey: historiaExitoQueries.all() });
      queryClient.invalidateQueries({ queryKey: ["public", "historias-exito"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al guardar la historia.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // mutacion editar (campos texto + opcionalmente nueva imagen en pasos secuenciales)
  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // 1) actualizar campos texto
      const result = await updateHistoriaExito(historia!.id, values);
      // 2) si hay imagen nueva, cambiarla
      if (imagenFile) {
        return cambiarImagenHistoriaExito(historia!.id, imagenFile);
      }
      return result;
    },
    onSuccess: () => {
      toast.success("Historia actualizada correctamente.");
      queryClient.invalidateQueries({ queryKey: historiaExitoQueries.all() });
      queryClient.invalidateQueries({ queryKey: ["public", "historias-exito"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al guardar la historia.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: FormValues) {
    if (!isEditing && !imagenFile) {
      toast.error("La imagen es obligatoria.");
      return;
    }
    if (isEditing) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  }

  // url de imagen actual en modo editar (cuando no hay nueva)
  const imagenActualUrl =
    historia && !previewUrl
      ? `${process.env.NEXT_PUBLIC_API_URL}/historias-exito/${historia.id}/imagen`
      : null;

  const showDropZone = !previewUrl && !imagenActualUrl;
  const descripcionActual = form.watch("descripcion") ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar historia de éxito" : "Nueva historia de éxito"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos o reemplaza la imagen."
              : "Esta historia aparecerá en la sección de la página de inicio."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* imagen */}
            <div>
              <FormLabel>Imagen *</FormLabel>
              <div className="mt-2">
                {previewUrl ? (
                  // preview de imagen nueva (a punto de subir)
                  <div className="relative overflow-hidden rounded-lg border border-secondary-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="h-48 w-full object-cover"
                    />
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
                        onClick={clearImagen}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : imagenActualUrl ? (
                  // imagen existente (modo editar, sin imagen nueva)
                  <div className="relative overflow-hidden rounded-lg border border-secondary-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenActualUrl}
                      alt="Imagen actual"
                      className="h-48 w-full object-cover"
                    />
                    <div className="absolute right-2 top-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="size-3.5" />
                        Cambiar imagen
                      </Button>
                    </div>
                  </div>
                ) : (
                  // drop zone
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
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                      isDragging
                        ? "border-primary-500 bg-primary-50"
                        : "border-secondary-300 hover:border-primary-400 hover:bg-secondary-50"
                    }`}
                  >
                    <CloudUpload
                      className={`size-10 ${isDragging ? "text-primary-500" : "text-secondary-400"}`}
                    />
                    <p className="text-sm font-medium text-secondary-700">
                      Arrastra una imagen o haz clic para subirla
                    </p>
                    <p className="text-xs text-secondary-400">
                      JPEG, PNG o WebP — máximo 5 MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={IMAGE_INPUT_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) validateAndSetFile(file);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                />
              </div>
            </div>

            {/* titulo */}
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ejemplo: Taller textil innovador"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* badge */}
            <FormField
              control={form.control}
              name="badge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiqueta</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ejemplo: Manufactura, Tecnología, Medio Ambiente"
                      maxLength={50}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : e.target.value)
                      }
                    />
                  </FormControl>
                  <p className="text-xs text-secondary-500">
                    Opcional. Aparece como badge en la card.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* descripcion */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe brevemente la historia de éxito"
                      rows={4}
                      maxLength={400}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-right text-xs text-secondary-500">
                    {descripcionActual.length}/400
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* empresa */}
            <FormField
              control={form.control}
              name="empresaNombre"
              render={() => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <EmpresaCombobox
                    value={{
                      empresaId: form.watch("empresaId") ?? null,
                      empresaNombre: form.watch("empresaNombre") ?? null,
                    }}
                    onChange={(v) => {
                      form.setValue("empresaId", v.empresaId, { shouldDirty: true });
                      form.setValue("empresaNombre", v.empresaNombre, { shouldDirty: true });
                    }}
                  />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" />}
                {isEditing ? "Guardar cambios" : "Crear historia"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
