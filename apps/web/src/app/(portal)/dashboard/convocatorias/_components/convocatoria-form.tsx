"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  type CreateConvocatoriaDto,
  type UpdateConvocatoriaDto,
  type ConvocatoriaResponse,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createConvocatoria, updateConvocatoria } from "@/lib/api/convocatoria.api";
import { convocatoriaQueries } from "@/lib/api/query-keys";

// 9 departamentos de Bolivia
const DEPARTAMENTOS_BOLIVIA = [
  "La Paz",
  "Cochabamba",
  "Santa Cruz",
  "Oruro",
  "Chuquisaca",
  "Beni",
  "Pando",
  "Potosí",
  "Tarija",
];

// schema local para el formulario (fechas como string date). El premio, los ganadores
// y las bases ya no viven en la convocatoria: se configuran por categoria.
// la validacion cross-campo de fechas se hace manualmente en onSubmit
const convocatoriaFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  fechaInicioPostulacion: z.string().min(1, "La fecha de inicio es obligatoria"),
  fechaCierrePostulacion: z.string().min(1, "La fecha de cierre es obligatoria"),
  fechaAnuncioGanadores: z.string().optional(),
  departamentos: z.array(z.string()).min(1, "Selecciona al menos un departamento"),
});

type ConvocatoriaFormValues = z.infer<typeof convocatoriaFormSchema>;

// transforma ConvocatoriaResponse a valores del formulario
function convocatoriaToFormValues(c: ConvocatoriaResponse): ConvocatoriaFormValues {
  return {
    nombre: c.nombre,
    descripcion: c.descripcion ?? undefined,
    fechaInicioPostulacion: c.fechaInicioPostulacion,
    fechaCierrePostulacion: c.fechaCierrePostulacion,
    fechaAnuncioGanadores: c.fechaAnuncioGanadores ?? undefined,
    departamentos: c.departamentos,
  };
}

// encabezado de seccion con icono-guia (mismo estilo que el resto de las vistas)
function SectionHead({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
        <Icon icon={icon} className="size-5" />
      </div>
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </div>
    </div>
  );
}

interface ConvocatoriaFormProps {
  initialData?: ConvocatoriaResponse;
}

export function ConvocatoriaForm({ initialData }: ConvocatoriaFormProps) {
  const isEditing = !!initialData;
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<ConvocatoriaFormValues>({
    resolver: zodResolver(convocatoriaFormSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      fechaInicioPostulacion: "",
      fechaCierrePostulacion: "",
      fechaAnuncioGanadores: "",
      departamentos: [],
    },
  });

  // pre-llenar cuando hay datos existentes
  useEffect(() => {
    if (initialData) {
      form.reset(convocatoriaToFormValues(initialData));
    }
  }, [initialData, form]);

  // mutacion crear
  const createMutation = useMutation({
    mutationFn: (dto: CreateConvocatoriaDto) => createConvocatoria(dto),
    onSuccess: (data) => {
      // aviso al coordinador: la convocatoria nace con 2 categorias que hay que
      // configurar (no es un adivino, se lo decimos y lo llevamos al detalle)
      toast.success(
        "Convocatoria creada con 2 categorías. Configura el formulario, la rúbrica y los evaluadores de cada categoría antes de publicar.",
      );
      queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
      router.push(`/dashboard/convocatorias/${data.id}`);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al crear la convocatoria";
      toast.error(msg);
    },
  });

  // mutacion editar
  const updateMutation = useMutation({
    mutationFn: (dto: UpdateConvocatoriaDto) => updateConvocatoria(initialData!.id, dto),
    onSuccess: () => {
      toast.success("Convocatoria actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
      router.push("/dashboard/convocatorias");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al actualizar la convocatoria";
      toast.error(msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: ConvocatoriaFormValues) {
    // validacion cross-campo: fecha cierre >= fecha inicio
    if (values.fechaCierrePostulacion < values.fechaInicioPostulacion) {
      form.setError("fechaCierrePostulacion", {
        message: "La fecha de cierre debe ser igual o posterior a la fecha de inicio",
      });
      return;
    }

    // limpiar strings vacios opcionales para no enviar "" al backend
    const dto: CreateConvocatoriaDto = {
      nombre: values.nombre,
      descripcion: values.descripcion || undefined,
      fechaInicioPostulacion: values.fechaInicioPostulacion,
      fechaCierrePostulacion: values.fechaCierrePostulacion,
      fechaAnuncioGanadores: values.fechaAnuncioGanadores || undefined,
      departamentos: values.departamentos,
    };

    if (isEditing) {
      updateMutation.mutate(dto);
    } else {
      createMutation.mutate(dto);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* aviso informativo solo en modo crear: la imagen se sube despues de
            crear la convocatoria, desde el tab General del detalle. Lo evitamos
            en edicion porque ahi el responsable ya tiene acceso a esa pestana. */}
        {!isEditing && (
          <div className="flex items-start gap-3 rounded-lg border border-primary-200 bg-primary-50/60 px-4 py-3 text-sm text-primary-900">
            <Icon
              icon="ph:image-duotone"
              className="mt-0.5 size-5 shrink-0 text-primary-600"
            />
            <p>
              Al crear la convocatoria se generan automáticamente sus categorías,
              cada una con su propio premio, formulario, rúbrica y bases (editables
              desde el detalle). También podrás subir la imagen de portada desde ahí.
            </p>
          </div>
        )}

        {/* fila 1: informacion basica + fechas en 2 columnas (aprovecha el ancho) */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* seccion 1: informacion basica */}
          <Card className="h-full">
            <CardHeader>
              <SectionHead
                icon="ph:note-pencil-duotone"
                title="Información básica"
                description="Nombre y descripción de la convocatoria."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la convocatoria *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Convocatoria de Impacto 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe brevemente la convocatoria"
                        rows={5}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* seccion 2: fechas (apiladas dentro de su columna) */}
          <Card className="h-full">
            <CardHeader>
              <SectionHead
                icon="ph:calendar-dots-duotone"
                title="Fechas"
                description="Período de postulación y anuncio de ganadores."
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fechaInicioPostulacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio de postulación *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaCierrePostulacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cierre de postulación *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaAnuncioGanadores"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anuncio de ganadores</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* seccion 3: departamentos (ancho completo) */}
        <Card>
          <CardHeader>
            <SectionHead
              icon="ph:map-pin-duotone"
              title="Departamentos *"
              description="Selecciona los departamentos donde estará disponible la convocatoria."
            />
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="departamentos"
              render={({ field }) => (
                <FormItem>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {DEPARTAMENTOS_BOLIVIA.map((dep) => (
                      <label
                        key={dep}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Checkbox
                          checked={field.value.includes(dep)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, dep]
                                : field.value.filter((v) => v !== dep),
                            );
                          }}
                        />
                        {dep}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* botones */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/convocatorias")}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading && <Loader2 className="animate-spin" />}
            <Save className="size-4" />
            {isEditing ? "Guardar cambios" : "Crear convocatoria"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
