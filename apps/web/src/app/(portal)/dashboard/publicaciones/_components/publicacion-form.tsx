"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CloudUpload, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import {
  type CreatePublicacionDto,
  type UpdatePublicacionDto,
  type PublicacionResponse,
} from "@superstars/shared";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StateBadge } from "@/components/shared/state-badge";
import { createPublicacion, updatePublicacion } from "@/lib/api/publicacion.api";
import { publicacionQueries, publicQueries } from "@/lib/api/query-keys";
import { PublicacionImageUpload } from "./publicacion-image-upload";
import { PublicacionEstadoActions } from "./publicacion-estado-actions";

// schema local para el formulario
const publicacionFormSchema = z.object({
  titulo: z.string().min(1, "El titulo es obligatorio").max(300),
  contenido: z
    .string()
    .min(1, "El contenido es obligatorio")
    .refine(
      (val) => val.replace(/<[^>]*>/g, "").trim().length > 0,
      "El contenido es obligatorio",
    ),
  categoriaId: z.number().int().positive().nullable(),
  destacado: z.boolean(),
});

type PublicacionFormValues = z.infer<typeof publicacionFormSchema>;

// valor especial para el select "sin categoria"
const NO_CATEGORIA = "none";

interface PublicacionFormProps {
  initialData?: PublicacionResponse;
}

export function PublicacionForm({ initialData }: PublicacionFormProps) {
  const isEditing = !!initialData;
  const router = useRouter();
  const queryClient = useQueryClient();

  // categorias disponibles
  const { data: categorias } = useQuery(publicQueries.categorias());

  const form = useForm<PublicacionFormValues>({
    resolver: zodResolver(publicacionFormSchema),
    defaultValues: {
      titulo: "",
      contenido: "",
      categoriaId: null,
      destacado: false,
    },
  });

  // estado para imagen al crear
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // tipos y tamano permitidos
  const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_SIZE = 5 * 1024 * 1024;

  function handleFileSelect(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imagenes JPEG, PNG o WebP");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("La imagen no debe superar 5 MB");
      return;
    }
    setImagenFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function handleRemoveFile() {
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
    if (file) handleFileSelect(file);
  }, []);

  // cleanup del preview al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // pre-llenar cuando hay datos existentes
  useEffect(() => {
    if (initialData) {
      form.reset({
        titulo: initialData.titulo,
        contenido: initialData.contenido,
        categoriaId: initialData.categoriaId,
        destacado: initialData.destacado,
      });
    }
  }, [initialData, form]);

  // mutacion crear
  const createMutation = useMutation({
    mutationFn: (dto: CreatePublicacionDto) =>
      createPublicacion(dto, imagenFile ?? undefined),
    onSuccess: () => {
      toast.success("Publicacion creada correctamente");
      queryClient.invalidateQueries({ queryKey: publicacionQueries.all() });
      router.push("/dashboard/publicaciones");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al crear la publicacion";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  // mutacion editar
  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePublicacionDto) =>
      updatePublicacion(initialData!.id, dto),
    onSuccess: () => {
      toast.success("Publicacion actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: publicacionQueries.all() });
      queryClient.invalidateQueries({
        queryKey: publicacionQueries.detail(initialData!.id).queryKey,
      });
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar la publicacion";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: PublicacionFormValues) {
    const dto = {
      titulo: values.titulo,
      contenido: values.contenido,
      categoriaId: values.categoriaId ?? undefined,
      destacado: values.destacado,
    };

    if (isEditing) {
      updateMutation.mutate(dto);
    } else {
      createMutation.mutate(dto as CreatePublicacionDto);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* columna izquierda: contenido */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Contenido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titulo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Titulo de la publicacion"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contenido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido *</FormLabel>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="Escribe el contenido de la publicacion..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* columna derecha: metadata */}
          <div className="space-y-6">
            {/* card estado y acciones */}
            <Card>
              <CardHeader>
                <CardTitle>Publicacion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* estado actual */}
                {isEditing && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-secondary-700">
                        Estado
                      </span>
                      <StateBadge
                        tipo="publicacion"
                        valor={initialData.estado}
                      />
                    </div>
                    <PublicacionEstadoActions publicacion={initialData} />
                  </div>
                )}

                {/* categoria */}
                <FormField
                  control={form.control}
                  name="categoriaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        value={
                          field.value != null
                            ? String(field.value)
                            : NO_CATEGORIA
                        }
                        onValueChange={(v) =>
                          field.onChange(v === NO_CATEGORIA ? null : Number(v))
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={NO_CATEGORIA}>
                            Sin categoria
                          </SelectItem>
                          {categorias?.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* destacado */}
                <FormField
                  control={form.control}
                  name="destacado"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel className="mt-0">Destacado</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* card imagen de portada */}
            <Card>
              <CardHeader>
                <CardTitle>Imagen de portada (opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <PublicacionImageUpload
                    publicacionId={initialData.id}
                    imagenDestacadaKey={initialData.imagenDestacadaKey}
                  />
                ) : previewUrl ? (
                  <div className="relative overflow-hidden rounded-lg border border-secondary-200">
                    <img
                      src={previewUrl}
                      alt="Preview imagen de portada"
                      className="h-40 w-full object-cover"
                    />
                    <div className="absolute right-2 top-2">
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="flex size-7 items-center justify-center rounded-md bg-white/80 text-secondary-700 hover:bg-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ) : (
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
                {!isEditing && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* botones */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/publicaciones")}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading && <Loader2 className="animate-spin" />}
            <Save className="size-4" />
            {isEditing ? "Guardar cambios" : "Guardar borrador"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
