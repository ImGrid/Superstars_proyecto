"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { loginSchema, type LoginDto } from "@superstars/shared";
import { isAxiosError } from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLogin } from "@/hooks/use-login";

function LoginForm() {
  const searchParams = useSearchParams();
  // ?registered=true:       legacy (registro pre-verificacion). Mantener por compat.
  // ?verified=true:         despues de confirmar el codigo de email — flujo actual.
  // ?password-changed=true: tras reset de contrasena exitoso
  const registered = searchParams.get("registered") === "true";
  const verified = searchParams.get("verified") === "true";
  const passwordChanged = searchParams.get("password-changed") === "true";
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginDto) => loginMutation.mutate(data);

  // extraer mensaje de error del backend
  const apiError = loginMutation.error;
  const errorMessage = apiError && isAxiosError(apiError)
    ? (apiError.response?.data as { message?: string })?.message || "Error al iniciar sesión"
    : apiError ? "Error al iniciar sesión" : null;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Iniciar Sesión
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Accede a tu cuenta
        </p>
      </div>

      {passwordChanged && (
        <Alert className="mb-4 border-success-500 bg-success-50 text-success-700">
          <AlertDescription>
            Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña.
          </AlertDescription>
        </Alert>
      )}

      {verified && !passwordChanged && (
        <Alert className="mb-4 border-success-500 bg-success-50 text-success-700">
          <AlertDescription>
            Cuenta verificada correctamente. Inicia sesión con tu correo y contraseña.
          </AlertDescription>
        </Alert>
      )}

      {registered && !verified && !passwordChanged && (
        <Alert className="mb-4 border-success-500 bg-success-50 text-success-700">
          <AlertDescription>
            Cuenta creada exitosamente. Inicia sesión con tus credenciales.
          </AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mb-4 border-error-500 bg-error-50 text-error-700">
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

        <div className="space-y-1">
          <Label htmlFor="password" className="text-secondary-700">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-error-600">
              {errors.password.message}
            </p>
          )}
          <div className="text-right">
            <Link
              href="/auth/recuperar-password"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Loader2 className="animate-spin" />}
          Iniciar Sesión
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary-500">
        ¿No tienes cuenta?{" "}
        <Link href="/auth/registro" className="font-medium text-primary-600 hover:text-primary-700">
          Regístrate
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
