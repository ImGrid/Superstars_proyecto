"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Lock, PlayCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { EstadoConcurso, type ConcursoResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  publicarConcurso,
  cerrarConcurso,
  iniciarEvaluacion,
  finalizarConcurso,
} from "@/lib/api/concurso.api";
import { concursoQueries } from "@/lib/api/query-keys";

interface ConcursoEstadoActionsProps {
  concurso: ConcursoResponse;
  // renderizar solo el boton, solo los alerts, o ambos
  button?: boolean;
  alerts?: boolean;
}

export function ConcursoEstadoActions({
  concurso,
  button,
  alerts,
}: ConcursoEstadoActionsProps) {
  const queryClient = useQueryClient();

  // si no se especifica ninguno, renderizar ambos
  const showButton = button || (!button && !alerts);
  const showAlerts = alerts || (!button && !alerts);

  // solo consultar canPublicar si esta en borrador
  const canPublicarQuery = useQuery({
    ...concursoQueries.canPublicar(concurso.id),
    enabled: concurso.estado === EstadoConcurso.BORRADOR,
  });

  function onTransitionSuccess(msg: string) {
    toast.success(msg);
    queryClient.invalidateQueries({ queryKey: concursoQueries.all() });
  }

  function onTransitionError(error: any) {
    const msg = error.response?.data?.message ?? "Error al cambiar el estado del concurso";
    if (Array.isArray(msg)) {
      msg.forEach((m: string) => toast.error(m));
    } else {
      toast.error(msg);
    }
  }

  switch (concurso.estado) {
    case EstadoConcurso.BORRADOR:
      return (
        <PublicarAction
          concursoId={concurso.id}
          canPublicar={canPublicarQuery.data?.canPublicar ?? false}
          errors={canPublicarQuery.data?.errors ?? []}
          isChecking={canPublicarQuery.isLoading}
          onSuccess={() => onTransitionSuccess("Concurso publicado correctamente")}
          onError={onTransitionError}
          showButton={showButton}
          showAlerts={showAlerts}
        />
      );
    case EstadoConcurso.PUBLICADO:
      if (!showButton) return null;
      return (
        <TransitionAction
          label="Cerrar postulaciones"
          icon={<Lock className="size-4" />}
          confirmTitle="Cerrar postulaciones"
          confirmDescription="Al cerrar el concurso, ya no se podran recibir nuevas postulaciones. Las postulaciones existentes se mantienen."
          mutationFn={() => cerrarConcurso(concurso.id)}
          onSuccess={() => onTransitionSuccess("Concurso cerrado correctamente")}
          onError={onTransitionError}
        />
      );
    case EstadoConcurso.CERRADO:
      if (!showButton) return null;
      return (
        <TransitionAction
          label="Iniciar evaluacion"
          icon={<PlayCircle className="size-4" />}
          confirmTitle="Iniciar evaluacion"
          confirmDescription="Se iniciara el periodo de evaluacion. Los evaluadores asignados podran comenzar a calificar las postulaciones."
          mutationFn={() => iniciarEvaluacion(concurso.id)}
          onSuccess={() => onTransitionSuccess("Evaluacion iniciada correctamente")}
          onError={onTransitionError}
        />
      );
    case EstadoConcurso.EN_EVALUACION:
      if (!showButton) return null;
      return (
        <TransitionAction
          label="Finalizar concurso"
          icon={<CheckCircle2 className="size-4" />}
          confirmTitle="Finalizar concurso"
          confirmDescription="Se finalizara el concurso y se publicaran los resultados. Esta accion no se puede deshacer."
          mutationFn={() => finalizarConcurso(concurso.id)}
          onSuccess={() => onTransitionSuccess("Concurso finalizado correctamente")}
          onError={onTransitionError}
        />
      );
    default:
      return null;
  }
}

// componente especial para Publicar (tiene canPublicar + lista de errores)
function PublicarAction({
  concursoId,
  canPublicar,
  errors,
  isChecking,
  onSuccess,
  onError,
  showButton,
  showAlerts,
}: {
  concursoId: number;
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
    mutationFn: () => publicarConcurso(concursoId),
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
          <AlertTriangle className="size-4" />
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
            Publicar concurso
          </Button>

          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Publicar concurso"
            description="Al publicar el concurso, el formulario y la rubrica quedaran inmutables. Las empresas podran ver y postularse al concurso."
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

// componente generico para transiciones simples (cerrar, iniciar evaluacion, finalizar)
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
  mutationFn: () => Promise<ConcursoResponse>;
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
