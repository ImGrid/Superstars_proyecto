"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useResetPassword } from "@/hooks/use-reset-password";
import { useResendResetCode } from "@/hooks/use-resend-reset-code";

const RECALIBRATE_COOLDOWN_SEC = 60;

// Schema local: nuevaPassword + confirmarPassword. El codigo se maneja
// con useState (igual que en verificar-cuenta) y se anexa al submit
const passwordFormSchema = z
  .object({
    nuevaPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.nuevaPassword === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function RestablecerPasswordForm() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const resetMutation = useResetPassword();
  const resendMutation = useResendResetCode();

  const [codigo, setCodigo] = useState("");
  const [resendCount, setResendCount] = useState(0);
  const [maxReached, setMaxReached] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(() =>
    computeResendCooldownSec(0),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  // Decrementar el countdown una vez por segundo
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  const handleResend = useCallback(() => {
    if (cooldownSec > 0 || resendMutation.isPending || maxReached) return;
    resendMutation.mutate(
      { email: emailParam },
      {
        onSuccess: () => {
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

  const onSubmit = (data: PasswordFormValues) => {
    if (codigo.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos.");
      return;
    }
    resetMutation.mutate({
      email: emailParam,
      codigo,
      nuevaPassword: data.nuevaPassword,
    });
  };

  // Errores tipados del reset (INVALID/EXPIRED/MAX_ATTEMPTS/INVALID_OR_EXPIRED)
  const apiError = resetMutation.error;
  const errorPayload =
    apiError && isAxiosError(apiError)
      ? (apiError.response?.data as { message?: string; code?: string } | undefined)
      : undefined;
  const errorCode = errorPayload?.code;
  const errorMessage =
    errorPayload?.message ?? (apiError ? "Error al restablecer la contraseña" : null);

  const requiereReinicio =
    errorCode === "EXPIRED" ||
    errorCode === "MAX_ATTEMPTS" ||
    errorCode === "INVALID_OR_EXPIRED" ||
    maxReached;

  if (!emailParam) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold text-secondary-900">
            Falta información
          </h1>
          <p className="mt-1 text-sm text-secondary-500">
            No pudimos identificar tu correo. Vuelve a solicitar el restablecimiento.
          </p>
        </div>
        <Link
          href="/auth/recuperar-password"
          className="block w-full rounded-md bg-primary-600 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
        >
          Volver a recuperar contraseña
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Restablece tu contraseña
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
            Alcanzaste el límite de reenvíos. Vuelve a solicitar el restablecimiento.
          </AlertDescription>
        </Alert>
      )}

      {requiereReinicio ? (
        <Link
          href={`/auth/recuperar-password`}
          className="block w-full rounded-md bg-primary-600 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
        >
          Volver a recuperar contraseña
        </Link>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="codigo-otp" className="text-secondary-700">
              Código de verificación
            </Label>
            <InputOTP
              id="codigo-otp"
              maxLength={6}
              value={codigo}
              onChange={(value) => setCodigo(value)}
              disabled={resetMutation.isPending}
              autoFocus
              pattern="^[0-9]+$"
              inputMode="numeric"
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
          </div>

          <div className="space-y-1">
            <Label htmlFor="nuevaPassword" className="text-secondary-700">
              Nueva contraseña
            </Label>
            <Input
              id="nuevaPassword"
              type="password"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              aria-invalid={!!errors.nuevaPassword}
              aria-describedby={errors.nuevaPassword ? "nueva-error" : undefined}
              {...register("nuevaPassword")}
            />
            {errors.nuevaPassword && (
              <p id="nueva-error" className="text-sm text-error-600">
                {errors.nuevaPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmarPassword" className="text-secondary-700">
              Confirma la nueva contraseña
            </Label>
            <Input
              id="confirmarPassword"
              type="password"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmarPassword}
              aria-describedby={
                errors.confirmarPassword ? "confirmar-error" : undefined
              }
              {...register("confirmarPassword")}
            />
            {errors.confirmarPassword && (
              <p id="confirmar-error" className="text-sm text-error-600">
                {errors.confirmarPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending && <Loader2 className="animate-spin" />}
            Restablecer contraseña
          </Button>

          <div className="space-y-3 text-center text-sm text-secondary-500">
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
          </div>
        </form>
      )}
    </div>
  );
}

export default function RestablecerPasswordPage() {
  return (
    <Suspense>
      <RestablecerPasswordForm />
    </Suspense>
  );
}
