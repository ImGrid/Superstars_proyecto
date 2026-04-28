"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordDto } from "@superstars/shared";
import { isAxiosError } from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForgotPassword } from "@/hooks/use-forgot-password";

export default function RecuperarPasswordPage() {
  const forgotMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordDto>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = (data: ForgotPasswordDto) => forgotMutation.mutate(data);

  const apiError = forgotMutation.error;
  const errorMessage =
    apiError && isAxiosError(apiError)
      ? (apiError.response?.data as { message?: string })?.message ||
        "Error al solicitar el restablecimiento"
      : apiError
      ? "Error al solicitar el restablecimiento"
      : null;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Recuperar contraseña
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="email" className="text-secondary-700">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            autoFocus
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-error-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={forgotMutation.isPending}
        >
          {forgotMutation.isPending && <Loader2 className="animate-spin" />}
          Enviar código
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary-500">
        ¿Recordaste tu contraseña?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
