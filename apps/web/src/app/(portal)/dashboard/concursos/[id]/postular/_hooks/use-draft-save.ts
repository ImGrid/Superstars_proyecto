import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { saveDraft } from "@/lib/api/postulacion.api";
import { postulacionQueries } from "@/lib/api/query-keys";

// limpia valores vacios del formulario antes de enviar al backend
function cleanResponseData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (value === undefined || value === null) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

// hook para guardar borrador de la postulacion
export function useDraftSave(
  concursoId: number,
  form: UseFormReturn<Record<string, unknown>>,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (responseData: Record<string, unknown>) =>
      saveDraft(concursoId, { responseData: cleanResponseData(responseData) }),
    onSuccess: () => {
      // limpiar errores del servidor cuando el guardado es exitoso
      form.clearErrors();
      queryClient.invalidateQueries({
        queryKey: postulacionQueries.mine(concursoId).queryKey,
      });
      queryClient.invalidateQueries({
        queryKey: ["postulaciones", "my-list"],
      });
      toast.success("Borrador guardado");
    },
    onError: (err: any) => {
      const errors = err.response?.data?.errors as
        | { campo: string; mensaje: string }[]
        | undefined;

      if (errors && errors.length > 0) {
        // setear error en cada campo especifico para que se muestre en rojo
        for (const { campo, mensaje } of errors) {
          form.setError(campo, { type: "server", message: mensaje });
        }
        toast.error("Hay errores en el formulario. Revisa los campos marcados.");
      } else {
        const msg = err.response?.data?.message ?? "Error al guardar borrador";
        toast.error(msg);
      }
    },
  });

  return {
    saveDraft: mutation.mutate,
    saveDraftAsync: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
