"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
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
  "Potosi",
  "Tarija",
];

// schema local para el formulario (monto como number, fechas como string date)
// replica createConvocatoriaSchema pero sin el .refine() para usar con react-hook-form
// la validacion cross-campo se hace manualmente en onSubmit
const convocatoriaFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  bases: z.string().optional(),
  fechaInicioPostulacion: z.string().min(1, "La fecha de inicio es obligatoria"),
  fechaCierrePostulacion: z.string().min(1, "La fecha de cierre es obligatoria"),
  fechaAnuncioGanadores: z.string().optional(),
  monto: z.number({ invalid_type_error: "Ingresa un monto valido" }).positive("El monto debe ser mayor a 0"),
  numeroGanadores: z.number().int().positive().default(3),
  topNSistema: z.number().int().positive().default(5),
  departamentos: z.array(z.string()).min(1, "Selecciona al menos un departamento"),
});

type ConvocatoriaFormValues = z.infer<typeof convocatoriaFormSchema>;

// transforma ConvocatoriaResponse a valores del formulario
// monto viene como string del backend (Drizzle numeric), lo convertimos a number
function convocatoriaToFormValues(c: ConvocatoriaResponse): ConvocatoriaFormValues {
  return {
    nombre: c.nombre,
    descripcion: c.descripcion ?? undefined,
    bases: c.bases ?? undefined,
    fechaInicioPostulacion: c.fechaInicioPostulacion,
    fechaCierrePostulacion: c.fechaCierrePostulacion,
    fechaAnuncioGanadores: c.fechaAnuncioGanadores ?? undefined,
    monto: parseFloat(c.monto),
    numeroGanadores: c.numeroGanadores,
    topNSistema: c.topNSistema,
    departamentos: c.departamentos,
  };
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
      departamentos: [],
      numeroGanadores: 3,
      topNSistema: 5,
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
    onSuccess: () => {
      toast.success("Convocatoria creada correctamente");
      queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
      router.push("/dashboard/convocatorias");
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
      bases: values.bases || undefined,
      fechaInicioPostulacion: values.fechaInicioPostulacion,
      fechaCierrePostulacion: values.fechaCierrePostulacion,
      fechaAnuncioGanadores: values.fechaAnuncioGanadores || undefined,
      monto: values.monto,
      numeroGanadores: values.numeroGanadores,
      topNSistema: values.topNSistema,
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
        {/* seccion 1: informacion basica */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>
              Nombre, descripción y bases de la convocatoria.
            </CardDescription>
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
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bases de la convocatoria</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Requisitos, criterios de elegibilidad y reglas"
                      rows={4}
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

        {/* seccion 2: fechas */}
        <Card>
          <CardHeader>
            <CardTitle>Fechas</CardTitle>
            <CardDescription>
              Período de postulación y anuncio de ganadores.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* seccion 3: monto y configuracion */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Monto asignado, cantidad de ganadores y configuración del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="monto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto asignado (Bs.) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Ej: 50000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numeroGanadores"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de ganadores</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="3"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topNSistema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top N del sistema</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="5"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* seccion 4: departamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Departamentos *</CardTitle>
            <CardDescription>
              Selecciona los departamentos donde estará disponible la convocatoria.
            </CardDescription>
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
