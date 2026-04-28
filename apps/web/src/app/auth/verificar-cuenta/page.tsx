"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  computeResendCooldownSec,
  VERIFICACION_EXPIRACION_MINUTOS,
} from "@superstars/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useVerifyEmail } from "@/hooks/use-verify-email";
import { useResendCode } from "@/hooks/use-resend-code";

// Cooldown de seguridad cuando el server responde COOLDOWN_ACTIVE pero el
// frontend perdio el estado local (caso comun: refresh de pagina). Cubre el
// peor caso del primer reenvio
const RECALIBRATE_COOLDOWN_SEC = 60;

function VerificarCuentaForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendCode();

  const [codigo, setCodigo] = useState("");
  // resendCount: cuantos reenvios hizo el usuario en esta sesion. NO persiste
  // (refresh lo resetea). El server tiene su propio contador autoritativo
  const [resendCount, setResendCount] = useState(0);
  const [maxReached, setMaxReached] = useState(false);
  // cooldownSec arranca en 30 (computeResendCooldownSec(0)) porque /registro
  // acaba de mandar el primer codigo: el usuario debe esperar antes del
  // primer reenvio. Sincronizado con el enforcement server-side
  const [cooldownSec, setCooldownSec] = useState(() =>
    computeResendCooldownSec(0),
  );

  // Decrementar el countdown una vez por segundo mientras este activo
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  // Auto-submit cuando se completan los 6 digitos
  useEffect(() => {
    if (codigo.length === 6 && emailParam && !verifyMutation.isPending) {
      verifyMutation.mutate({ email: emailParam, codigo });
    }
    // intencionalmente sin verifyMutation en deps — solo reaccionar al codigo completo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, emailParam]);

  // Si falla la verificacion, limpiar el codigo para que el usuario reintente sin tener que borrar
  useEffect(() => {
    if (verifyMutation.isError) {
      setCodigo("");
    }
  }, [verifyMutation.isError]);

  const handleResend = useCallback(() => {
    if (cooldownSec > 0 || resendMutation.isPending || maxReached) return;
    resendMutation.mutate(
      { email: emailParam },
      {
        onSuccess: () => {
          // Confirmacion + arrancar el siguiente cooldown progresivo
          // (mismo helper que el server usa para enforcement)
          const newCount = resendCount + 1;
          setResendCount(newCount);
          setCooldownSec(computeResendCooldownSec(newCount));
          setCodigo("");
          toast.success("Te enviamos un código nuevo. Revisa tu bandeja.");
        },
        onError: (err) => {
          if (!isAxiosError(err)) {
            toast.error("Error al reenviar el código");
            return;
          }
          const data = err.response?.data as
            | { code?: string; message?: string }
            | undefined;
          const code = data?.code;
          if (code === "MAX_RESENDS") {
            setMaxReached(true);
          } else if (code === "COOLDOWN_ACTIVE") {
            // El server nos dice que aun esta en cooldown. Probablemente el
            // frontend perdio el state (refresh de pagina). Recalibrar el
            // timer local a un valor seguro
            setCooldownSec(RECALIBRATE_COOLDOWN_SEC);
            toast.error(
              data?.message ?? "Espera unos segundos antes de reenviar.",
            );
          } else if (code === "RATE_LIMITED") {
            toast.error(
              data?.message ?? "Demasiados intentos. Intenta más tarde.",
            );
          } else {
            toast.error(data?.message ?? "Error al reenviar el código");
          }
        },
      },
    );
  }, [cooldownSec, emailParam, maxReached, resendCount, resendMutation]);

  // Errores de verifyEmail (no del resend — esos se muestran como toast)
  const apiError = verifyMutation.error;
  const errorPayload =
    apiError && isAxiosError(apiError)
      ? (apiError.response?.data as { message?: string; code?: string } | undefined)
      : undefined;
  const errorCode = errorPayload?.code;
  const errorMessage = errorPayload?.message ?? (apiError ? "Error al verificar el código" : null);

  // Si la verificacion expiro / agoto intentos, o si el reenvio agoto el tope,
  // ofrecer volver a registro
  const requiereReregistro =
    errorCode === "EXPIRED" ||
    errorCode === "MAX_ATTEMPTS" ||
    errorCode === "INVALID_OR_EXPIRED" ||
    maxReached;

  // Caso borde: usuario llego sin email en query (URL pegada o vieja)
  if (!emailParam) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold text-secondary-900">
            Falta información
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            No pudimos identificar tu correo. Vuelve a registrarte.
          </p>
        </div>
        <Link
          href="/auth/registro"
          className="block w-full rounded-md bg-primary-600 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
        >
          Volver a registro
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Confirma tu cuenta
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Te enviamos un código de 6 dígitos a
        </p>
        <p className="mt-1 text-sm font-medium text-secondary-700 break-all">
          {emailParam}
        </p>
      </div>

      {errorMessage && (
        <Alert
          variant="destructive"
          className="mb-4 border-error-500 bg-error-50 text-error-700"
        >
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {maxReached && !errorMessage && (
        <Alert className="mb-4 border-warning-500 bg-warning-50 text-warning-700">
          <AlertDescription>
            Alcanzaste el límite de reenvíos. Vuelve a registrarte para recibir un código nuevo.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={codigo}
          onChange={(value) => setCodigo(value)}
          disabled={verifyMutation.isPending || requiereReregistro}
          autoFocus
          // Solo digitos
          pattern="^[0-9]+$"
          inputMode="numeric"
          // Habilita autofill nativo de iOS/Android para codigos del email
          autoComplete="one-time-code"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>

        {verifyMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-secondary-500">
            <Loader2 className="size-4 animate-spin" />
            Verificando...
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3 text-center text-sm text-secondary-500">
        {requiereReregistro ? (
          <Link
            href={`/auth/registro?email=${encodeURIComponent(emailParam)}`}
            className="block rounded-md bg-primary-600 py-2 font-medium text-white hover:bg-primary-700"
          >
            Volver a registro
          </Link>
        ) : (
          <>
            <p>
              El código expira en {VERIFICACION_EXPIRACION_MINUTOS} minutos.
              Revisa tu bandeja de entrada (incluido spam).
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={cooldownSec > 0 || resendMutation.isPending}
              className="w-full"
            >
              {resendMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {cooldownSec > 0
                ? `Reenviar código (${cooldownSec}s)`
                : "Reenviar código"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerificarCuentaPage() {
  return (
    <Suspense>
      <VerificarCuentaForm />
    </Suspense>
  );
}
