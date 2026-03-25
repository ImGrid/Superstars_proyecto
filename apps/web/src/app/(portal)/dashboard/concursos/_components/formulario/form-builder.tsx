"use client";

import { useReducer, useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Save,
} from "lucide-react";
import type { FormularioResponse, FormField, SchemaDefinition } from "@superstars/shared";
import { schemaDefinitionSchema } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formularioQueries } from "@/lib/api/query-keys";
import { updateFormulario } from "@/lib/api/formulario.api";
import { schemaReducer } from "./_lib/schema-reducer";
import { seccionId } from "./_lib/id-utils";
import { validateSchema, hasErrors } from "./_lib/builder-validation";
import { SeccionItem } from "./seccion-item";
import { CampoConfigSheet } from "./campo-config-sheet";

interface FormBuilderProps {
  concursoId: number;
  formulario: FormularioResponse;
  canEdit: boolean;
}

// campo en edicion (para el sheet)
interface EditingCampo {
  seccionId: string;
  campo: FormField;
}

export function FormBuilder({ concursoId, formulario, canEdit }: FormBuilderProps) {
  const queryClient = useQueryClient();
  const versionRef = useRef(formulario.version);

  // estado principal del schema
  const [schema, dispatch] = useReducer(schemaReducer, formulario.schemaDefinition);
  const [isDirty, setIsDirty] = useState(false);

  // campo en edicion (sheet lateral)
  const [editingCampo, setEditingCampo] = useState<EditingCampo | null>(null);

  // validaciones en tiempo real
  const warnings = useMemo(() => validateSchema(schema), [schema]);
  const errorCount = useMemo(
    () => warnings.filter((w) => w.severity === "error").length,
    [warnings],
  );
  const warningCount = useMemo(
    () => warnings.filter((w) => w.severity === "warning").length,
    [warnings],
  );

  // marcar dirty en cada dispatch
  const dispatchWithDirty = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      dispatch(action);
      setIsDirty(true);
    },
    [],
  );

  // beforeunload para prevenir navegacion
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // mutation de guardado
  const saveMutation = useMutation({
    mutationFn: () =>
      updateFormulario(concursoId, {
        schemaDefinition: schema,
        version: versionRef.current,
      }),
    onSuccess: (data) => {
      versionRef.current = data.version;
      setIsDirty(false);
      toast.success("Formulario guardado correctamente");
      queryClient.invalidateQueries({
        queryKey: formularioQueries.detail(concursoId).queryKey,
      });
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const msg = error.response?.data?.message ?? "Error al guardar el formulario";
      if (status === 409) {
        toast.error("El formulario fue modificado por otro usuario. Recargando...");
        queryClient.invalidateQueries({
          queryKey: formularioQueries.detail(concursoId).queryKey,
        });
      } else {
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
    },
  });

  // guardar
  const handleSave = useCallback(() => {
    if (hasErrors(warnings)) {
      toast.error("Corrige los errores antes de guardar");
      return;
    }
    // validacion Zod autoritativa
    const result = schemaDefinitionSchema.safeParse(schema);
    if (!result.success) {
      const firstError = result.error.errors[0]?.message ?? "Schema invalido";
      toast.error(firstError);
      return;
    }
    saveMutation.mutate();
  }, [schema, warnings, saveMutation]);

  // agregar seccion
  const handleAddSeccion = useCallback(() => {
    dispatchWithDirty({
      type: "ADD_SECCION",
      payload: {
        id: seccionId(),
        titulo: `Seccion ${schema.secciones.length + 1}`,
        orden: schema.secciones.length + 1,
        fija: false,
      },
    });
  }, [schema.secciones.length, dispatchWithDirty]);

  // abrir sheet de edicion
  const handleEditCampo = useCallback((secId: string, campo: FormField) => {
    setEditingCampo({ seccionId: secId, campo: { ...campo } });
  }, []);

  // aplicar cambios del sheet
  const handleApplyCampo = useCallback(
    (campo: FormField) => {
      if (!editingCampo) return;
      dispatchWithDirty({
        type: "UPDATE_CAMPO",
        payload: {
          seccionId: editingCampo.seccionId,
          campoId: editingCampo.campo.id,
          campo,
        },
      });
      setEditingCampo(null);
    },
    [editingCampo, dispatchWithDirty],
  );

  // contar campos total
  const totalCampos = schema.secciones.reduce((sum, s) => sum + s.campos.length, 0);

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border border-secondary-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-sm font-semibold text-secondary-900">
              {formulario.nombre}
            </h3>
            <p className="text-xs text-secondary-500">
              {schema.secciones.length} secciones, {totalCampos} campos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* indicadores de validacion */}
          {errorCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" />
                  {errorCount} {errorCount === 1 ? "error" : "errores"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Corrige los errores para poder guardar</p>
              </TooltipContent>
            </Tooltip>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              {warningCount} {warningCount === 1 ? "aviso" : "avisos"}
            </Badge>
          )}

          {isDirty && (
            <Badge variant="outline" className="text-secondary-500">
              Sin guardar
            </Badge>
          )}

          {canEdit && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending || (hasErrors(warnings) && isDirty)}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Guardar
            </Button>
          )}
        </div>
      </div>

      {/* canvas de secciones */}
      <div className="space-y-4">
        {schema.secciones.map((seccion, idx) => (
          <SeccionItem
            key={seccion.id}
            seccion={seccion}
            isFirst={idx === 0}
            isLast={idx === schema.secciones.length - 1}
            canEdit={canEdit}
            warnings={warnings}
            dispatch={dispatchWithDirty}
            onEditCampo={handleEditCampo}
          />
        ))}
      </div>

      {/* boton agregar seccion */}
      {canEdit && (
        <Button variant="outline" className="w-full" onClick={handleAddSeccion}>
          <Plus className="size-4" />
          Agregar seccion
        </Button>
      )}

      {/* sheet de configuracion de campo */}
      <CampoConfigSheet
        campo={editingCampo?.campo ?? null}
        open={!!editingCampo}
        onOpenChange={(open) => {
          if (!open) setEditingCampo(null);
        }}
        onApply={handleApplyCampo}
      />
    </div>
  );
}
