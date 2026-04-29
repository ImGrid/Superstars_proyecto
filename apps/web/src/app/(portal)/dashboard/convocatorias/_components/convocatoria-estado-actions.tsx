"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Lock, PlayCircle, Globe } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { EstadoConvocatoria, type ConvocatoriaResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  publicarConvocatoria,
  cerrarConvocatoria,
  iniciarEvaluacion,
  publicarResultados,
} from "@/lib/api/convocatoria.api";
import { convocatoriaQueries } from "@/lib/api/query-keys";

interface ConvocatoriaEstadoActionsProps {
  convocatoria: ConvocatoriaResponse;
  // renderizar solo el boton, solo los alerts, o ambos
  button?: boolean;
  alerts?: boolean;
}

export function ConvocatoriaEstadoActions({
  convocatoria,
  button,
  alerts,
}: ConvocatoriaEstadoActionsProps) {
  const queryClient = useQueryClient();

  // si no se especifica ninguno, renderizar ambos
  const showButton = button || (!button && !alerts);
  const showAlerts = alerts || (!button && !alerts);

  // solo consultar canPublicar si esta en borrador
  const canPublicarQuery = useQuery({
    ...convocatoriaQueries.canPublicar(convocatoria.id),
    enabled: convocatoria.estado === EstadoConvocatoria.BORRADOR,
  });

  // solo consultar canFinalizar si esta en resultados_listos
  const canFinalizarQuery = useQuery({
    ...convocatoriaQueries.canFinalizar(convocatoria.id),
    enabled: convocatoria.estado === EstadoConvocatoria.RESULTADOS_LISTOS,
  });

  function onTransitionSuccess(msg: string) {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: convocatoriaQueries.all() });
  }

  function onTransitionError(error: any) {
    const msg = error.response?.data?.message ?? "Error al cambiar el estado de la convocatoria";
    if (Array.isArray(msg)) {
      msg.forEach((m: string) => toast.error(m));
    } else {
      toast.error(msg);
    }
  }

  switch (convocatoria.estado) {
    case EstadoConvocatoria.BORRADOR:
      return (
        <PublicarAction
          convocatoriaId={convocatoria.id}
          canPublicar={canPublicarQuery.data?.canPublicar ?? false}
          errors={canPublicarQuery.data?.errors ?? []}
          isChecking={canPublicarQuery.isLoading}
          onSuccess={() => onTransitionSuccess("Convocatoria publicada correctamente")}
          onError={onTransitionError}
          showButton={showButton}
          showAlerts={showAlerts}
        />
      );
    case EstadoConvocatoria.PUBLICADO:
      if (!showButton) return null;
      return (
        <TransitionAction
          label="Cerrar postulaciones"
          icon={<Lock className="size-4" />}
          confirmTitle="Cerrar postulaciones"
          confirmDescription="Al cerrar la convocatoria, ya no se podrán recibir nuevas postulaciones. Las postulaciones existentes se mantienen."
          mutationFn={() => cerrarConvocatoria(convocatoria.id)}
          onSuccess={() => onTransitionSuccess("Convocatoria cerrada correctamente")}
          onError={onTransitionError}
        />
      );
    case EstadoConvocatoria.CERRADO:
      if (!showButton) return null;
      return (
        <TransitionAction
          label="Iniciar evaluación"
          icon={<PlayCircle className="size-4" />}
          confirmTitle="Iniciar evaluación"
          confirmDescription="Se iniciará el periodo de evaluación. Los evaluadores asignados podrán comenzar a calificar las postulaciones."
          mutationFn={() => iniciarEvaluacion(convocatoria.id)}
          onSuccess={() => onTransitionSuccess("Evaluación iniciada correctamente")}
          onError={onTransitionError}
        />
      );
    case EstadoConvocatoria.EN_EVALUACION:
      // la seleccion de ganadores se hace desde la tab de postulaciones
      return null;
    case EstadoConvocatoria.RESULTADOS_LISTOS:
      return (
        <PublicarResultadosAction
          convocatoriaId={convocatoria.id}
          canFinalizar={canFinalizarQuery.data?.canFinalizar ?? false}
          errors={canFinalizarQuery.data?.errors ?? []}
          isChecking={canFinalizarQuery.isLoading}
          onSuccess={() => onTransitionSuccess("Resultados publicados correctamente")}
          onError={onTransitionError}
          showButton={showButton}
          showAlerts={showAlerts}
        />
      );
    default:
      return null;
  }
}

// componente especial para Publicar convocatoria (tiene canPublicar + lista de errores)
function PublicarAction({
  convocatoriaId,
  canPublicar,
  errors,
  isChecking,
  onSuccess,
  onError,
  showButton,
  showAlerts,
}: {
  convocatoriaId: number;
  canPublicar: boolean;
  errors: string[];
  isChecking: boolean;
  onSuccess: () => void;
  onError: (error: any) => void;
  showButton: boolean;
  showAlerts: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => publicarConvocatoria(convocatoriaId),
    onSuccess: () => {
      setConfirmOpen(false);
      onSuccess();
    },
    onError: (error) => {
      setConfirmOpen(false);
      onError(error);
    },
  });

  return (
    <>
      {showAlerts && !isChecking && errors.length > 0 && (
        <Alert>
          <Icon icon="ph:warning-duotone"className="size-4" />
          <AlertDescription>
            <p className="mb-2 font-medium">Requisitos pendientes para publicar:</p>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((err) => (
                <li key={err} className="text-sm">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {showButton && (
        <>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canPublicar || isChecking}
          >
            {isChecking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Publicar convocatoria
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Publicar convocatoria"
            description="Al publicar la convocatoria, el formulario y la rúbrica quedarán inmutables. Las empresas podrán ver y postularse a la convocatoria."
            confirmLabel="Publicar"
            onConfirm={() => mutation.mutate()}
            isLoading={mutation.isPending}
            destructive={false}
          />
        </>
      )}
    </>
  );
}

// componente para Publicar resultados (tiene canFinalizar + lista de errores)
function PublicarResultadosAction({
  convocatoriaId,
  canFinalizar,
  errors,
  isChecking,
  onSuccess,
  onError,
  showButton,
  showAlerts,
}: {
  convocatoriaId: number;
  canFinalizar: boolean;
  errors: string[];
  isChecking: boolean;
  onSuccess: () => void;
  onError: (error: any) => void;
  showButton: boolean;
  showAlerts: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => publicarResultados(convocatoriaId),
    onSuccess: () => {
      setConfirmOpen(false);
      onSuccess();
    },
    onError: (error) => {
      setConfirmOpen(false);
      onError(error);
    },
  });

  return (
    <>
      {showAlerts && !isChecking && errors.length > 0 && (
        <Alert>
          <Icon icon="ph:warning-duotone"className="size-4" />
          <AlertDescription>
            <p className="mb-2 font-medium">Requisitos pendientes para publicar resultados:</p>
            <ul className="list-disc pl-4 space-y-1">
              {errors.map((err) => (
                <li key={err} className="text-sm">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {showButton && (
        <>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canFinalizar || isChecking}
          >
            {isChecking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Globe className="size-4" />
            )}
            Publicar resultados
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Publicar resultados"
            description="Los resultados serán visibles en la página pública de la convocatoria. Los ganadores y las empresas no seleccionadas podrán ver su resultado. Esta acción no se puede deshacer."
            confirmLabel="Publicar resultados"
            onConfirm={() => mutation.mutate()}
            isLoading={mutation.isPending}
            destructive={false}
          />
        </>
      )}
    </>
  );
}

// componente generico para transiciones simples (cerrar, iniciar evaluacion)
function TransitionAction({
  label,
  icon,
  confirmTitle,
  confirmDescription,
  mutationFn,
  onSuccess,
  onError,
}: {
  label: string;
  icon: React.ReactNode;
  confirmTitle: string;
  confirmDescription: string;
  mutationFn: () => Promise<ConvocatoriaResponse>;
  onSuccess: () => void;
  onError: (error: any) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      setConfirmOpen(false);
      onSuccess();
    },
    onError: (error) => {
      setConfirmOpen(false);
      onError(error);
    },
  });

  return (
    <>
      <Button onClick={() => setConfirmOpen(true)}>
        {icon}
        {label}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={label}
        onConfirm={() => mutation.mutate()}
        isLoading={mutation.isPending}
        destructive={false}
      />
    </>
  );
}
