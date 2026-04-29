import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UseFormReturn } from "react-hook-form";
import { saveDraft } from "@/lib/api/postulacion.api";
import { postulacionQueries } from "@/lib/api/query-keys";

// limpia una celda de tabla: "" / null / undefined → se omite del objeto fila
function cleanRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === "" || value === null || value === undefined) continue;
    cleaned[key] = value;
  }
  // si toda la fila quedo vacia, retornar null para descartarla
  return Object.keys(cleaned).length === 0 ? null : cleaned;
}

// limpia valores vacios del formulario antes de enviar al backend.
// para arrays de objetos (tablas), recurre celda por celda y descarta
// filas completamente vacias para evitar errores de validacion en draft.
function cleanResponseData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === "") continue;
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      // detectar arrays de objetos (filas de tabla) vs arrays primitivos (selecciones, archivos)
      const isObjectArray = value.every(
        (item) => typeof item === "object" && item !== null && !Array.isArray(item),
      );
      if (isObjectArray) {
        const rows = (value as Record<string, unknown>[])
          .map(cleanRow)
          .filter((r): r is Record<string, unknown> => r !== null);
        if (rows.length === 0) continue;
        cleaned[key] = rows;
        continue;
      }
    }
    cleaned[key] = value;
  }
  return cleaned;
}

// hook para guardar borrador de la postulacion
export function useDraftSave(
  convocatoriaId: number,
  form: UseFormReturn<Record<string, unknown>>,
) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (responseData: Record<string, unknown>) =>
      saveDraft(convocatoriaId, { responseData: cleanResponseData(responseData) }),
    onSuccess: () => {
      // limpiar errores del servidor cuando el guardado es exitoso
      form.clearErrors();
      queryClient.invalidateQueries({
        queryKey: postulacionQueries.mine(convocatoriaId).queryKey,
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
