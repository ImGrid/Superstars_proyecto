"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterDto } from "@superstars/shared";
import { isAxiosError } from "axios";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRegister } from "@/hooks/use-register";

export default function RegistroPage() {
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterDto) => registerMutation.mutate(data);

  // extraer mensaje de error del backend
  const apiError = registerMutation.error;
  const errorMessage = apiError && isAxiosError(apiError)
    ? (apiError.response?.data as { message?: string })?.message || "Error al registrar"
    : apiError ? "Error al registrar" : null;

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-secondary-200">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          Crear Cuenta
        </h1>
        <p className="mt-1 text-sm text-secondary-500">
          Registra tu empresa para postular a concursos
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mb-4 border-error-500 bg-error-50 text-error-700">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nombre" className="text-secondary-700">
            Nombre
          </Label>
          <Input
            id="nombre"
            type="text"
            placeholder="Tu nombre completo"
            autoComplete="name"
            aria-invalid={!!errors.nombre}
            aria-describedby={errors.nombre ? "nombre-error" : undefined}
            {...register("nombre")}
          />
          {errors.nombre && (
            <p id="nombre-error" className="text-sm text-error-600">
              {errors.nombre.message}
            </p>
          )}
        </div>

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
            autoComplete="new-password"
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

        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending && <Loader2 className="animate-spin" />}
          Crear Cuenta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-secondary-500">
        Ya tienes cuenta?{" "}
        <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-700">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}
