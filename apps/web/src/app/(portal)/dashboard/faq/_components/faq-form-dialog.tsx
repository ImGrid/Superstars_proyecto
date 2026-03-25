"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createFaqSchema, type FaqResponse } from "@superstars/shared";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createFaq, updateFaq } from "@/lib/api/faq.api";
import { faqQueries } from "@/lib/api/query-keys";

// schema del formulario (mismo para crear y editar)
const formSchema = createFaqSchema;
type FormValues = z.infer<typeof formSchema>;

interface FaqFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: FaqResponse;
}

export function FaqFormDialog({ open, onOpenChange, faq }: FaqFormDialogProps) {
  const isEditing = !!faq;
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { pregunta: "", respuesta: "", orden: 0 },
  });

  // resetear cuando se abre/cierra o cambia el faq
  useEffect(() => {
    if (!open) return;
    if (faq) {
      form.reset({
        pregunta: faq.pregunta,
        respuesta: faq.respuesta,
        orden: faq.orden,
      });
    } else {
      form.reset({ pregunta: "", respuesta: "", orden: 0 });
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
                      placeholder="Ej: ¿Cómo puedo postular al programa?"
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
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orden"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden de aparición</FormLabel>
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
