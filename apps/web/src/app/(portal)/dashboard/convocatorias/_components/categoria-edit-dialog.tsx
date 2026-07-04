"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { CategoriaResponse } from "@superstars/shared";
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
import { createCategoria, updateCategoria } from "@/lib/api/categoria.api";
import { categoriaQueries } from "@/lib/api/query-keys";

// schema local del formulario (monto como number; el backend recibe number)
const categoriaFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
  monto: z
    .number({ invalid_type_error: "Ingresa un premio válido" })
    .positive("El premio debe ser mayor a 0"),
  numeroGanadores: z
    .number({ invalid_type_error: "Ingresa un número válido" })
    .int()
    .positive("Debe haber al menos 1 ganador"),
  bases: z.string().optional(),
});

type CategoriaFormValues = z.infer<typeof categoriaFormSchema>;

interface CategoriaEditDialogProps {
  convocatoriaId: number;
  // null = modo crear una categoria nueva; con valor = editar esa categoria
  categoria: CategoriaResponse | null;
  // orden para la categoria nueva (al crear)
  nextOrden?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriaEditDialog({
  convocatoriaId,
  categoria,
  nextOrden,
  open,
  onOpenChange,
}: CategoriaEditDialogProps) {
  const queryClient = useQueryClient();
  const esCrear = categoria === null;

  const form = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaFormSchema),
    defaultValues: { nombre: "", numeroGanadores: 3 },
  });

  // pre-llenar al abrir: si es editar, con la categoria; si es crear, en blanco
  useEffect(() => {
    if (!open) return;
    if (categoria) {
      form.reset({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion ?? undefined,
        monto: parseFloat(categoria.monto),
        numeroGanadores: categoria.numeroGanadores,
        bases: categoria.bases ?? undefined,
      });
    } else {
      form.reset({
        nombre: "",
        descripcion: "",
        monto: undefined as unknown as number,
        numeroGanadores: 3,
        bases: "",
      });
    }
  }, [categoria, open, form]);

  const mutation = useMutation({
    mutationFn: (values: CategoriaFormValues) => {
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion || undefined,
        monto: values.monto,
        numeroGanadores: values.numeroGanadores,
        bases: values.bases || undefined,
      };
      return categoria
        ? updateCategoria(convocatoriaId, categoria.id, payload)
        : createCategoria(convocatoriaId, {
            ...payload,
            orden: nextOrden ?? 1,
            // top N del sistema: campo interno; se usa el default del backend
            topNSistema: 10,
          });
    },
    onSuccess: () => {
      toast.success(
        esCrear
          ? "Categoría agregada correctamente"
          : "Categoría actualizada correctamente",
      );
      queryClient.invalidateQueries({
        queryKey: categoriaQueries.list(convocatoriaId).queryKey,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al guardar la categoría";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {esCrear ? "Agregar categoría" : "Editar categoría"}
          </DialogTitle>
          <DialogDescription>
            {esCrear
              ? "Crea una categoría nueva. Después podrás configurar su formulario y su rúbrica desde las pestañas correspondientes."
              : "Cambia el nombre, el premio, el número de ganadores y las bases de esta categoría."}{" "}
            Solo se puede mientras la convocatoria está en borrador.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la categoría *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Empresas de Triple Impacto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Premio (Bs.) *</FormLabel>
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
                    <FormLabel>Número de ganadores *</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Breve descripción de la categoría"
                      rows={2}
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
                  <FormLabel>Bases</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Requisitos y reglas específicas de esta categoría"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {esCrear ? "Agregar categoría" : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
