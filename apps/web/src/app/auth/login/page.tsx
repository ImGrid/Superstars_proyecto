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
  const registered = searchParams.get("registered") === "true";
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
    ? (apiError.response?.data as { message?: string })?.message || "Error al iniciar sesion"
    : apiError ? "Error al iniciar sesion" : null;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Iniciar Sesion
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Accede a tu cuenta
        </p>
      </div>

      {registered && (
        <Alert className="mb-4 border-success-500 bg-success-50 text-success-700">
          <AlertDescription>
            Cuenta creada exitosamente. Inicia sesion con tus credenciales.
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
            Correo electronico
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
            Contrasena
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Minimo 8 caracteres"
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
        </div>

        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Loader2 className="animate-spin" />}
          Iniciar Sesion
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary-500">
        No tienes cuenta?{" "}
        <Link href="/auth/registro" className="font-medium text-primary-600 hover:text-primary-700">
          Registrate
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
