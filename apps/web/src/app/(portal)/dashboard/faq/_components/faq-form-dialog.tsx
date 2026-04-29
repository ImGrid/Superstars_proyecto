"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createFaqSchema, type FaqResponse, type CategoriaFaq } from "@superstars/shared";
import { z } from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createFaq, updateFaq } from "@/lib/api/faq.api";
import { faqQueries, convocatoriaQueries } from "@/lib/api/query-keys";

const formSchema = createFaqSchema;
type FormValues = z.infer<typeof formSchema>;

// labels amigables para las categorias
const CATEGORIA_OPTIONS = [
  { value: "general", label: "General", desc: "Sobre el programa en general" },
  { value: "participacion", label: "Participación", desc: "Cómo inscribirse y requisitos" },
  { value: "proceso", label: "Proceso", desc: "Evaluación, resultados y montos" },
] as const;

interface FaqFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: FaqResponse;
}

export function FaqFormDialog({ open, onOpenChange, faq }: FaqFormDialogProps) {
  const isEditing = !!faq;
  const queryClient = useQueryClient();

  // lista de convocatorias para el selector opcional
  const { data: convocatorias } = useQuery(convocatoriaQueries.list({ limit: 100 }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pregunta: "",
      respuesta: "",
      orden: 0,
      categoria: "general",
      convocatoriaId: null,
    },
  });

  // resetear cuando se abre/cierra o cambia el faq
  useEffect(() => {
    if (!open) return;
    if (faq) {
      form.reset({
        pregunta: faq.pregunta,
        respuesta: faq.respuesta,
        orden: faq.orden,
        categoria: faq.categoria as CategoriaFaq,
        convocatoriaId: faq.convocatoriaId,
      });
    } else {
      form.reset({
        pregunta: "",
        respuesta: "",
        orden: 0,
        categoria: "general",
        convocatoriaId: null,
      });
    }
  }, [open, faq, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      isEditing ? updateFaq(faq!.id, values) : createFaq(values),
    onSuccess: () => {
      toast.success(
        isEditing
          ? "Pregunta actualizada correctamente"
          : "Pregunta creada correctamente",
      );
      queryClient.invalidateQueries({ queryKey: faqQueries.all() });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al guardar la pregunta";
      toast.error(msg);
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar pregunta" : "Nueva pregunta"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica la pregunta y respuesta."
              : "Agrega una nueva pregunta frecuente."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pregunta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pregunta</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Como puedo postular al programa?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="respuesta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Respuesta</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe la respuesta a la pregunta..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* categoria */}
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIA_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* orden */}
              <FormField
                control={form.control}
                name="orden"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* convocatoria especifico opcional */}
            <FormField
              control={form.control}
              name="convocatoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convocatoria específica (opcional)</FormLabel>
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === "none" ? null : Number(val))
                    }
                    value={field.value?.toString() ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Para todos las convocatorias" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Para todos las convocatorias</SelectItem>
                      {convocatorias?.data.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Si vinculas esta pregunta a una convocatoria, solo aparecerá en la página de esa convocatoria, no en el FAQ general.
                  </FormDescription>
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
                {mutation.isPending && <Loader2 className="animate-spin" />}
                {isEditing ? "Guardar cambios" : "Crear pregunta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
