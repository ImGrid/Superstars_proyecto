"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, MapPin, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// correo destino del formulario
const CONTACT_EMAIL = "superimpact@ecv-impactobo.com";

// schema local (no se comparte con backend porque no hay endpoint)
const contactoSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  email: z.string().email("Correo electrónico inválido"),
  asunto: z
    .string()
    .min(3, "El asunto debe tener al menos 3 caracteres")
    .max(150, "Máximo 150 caracteres"),
  mensaje: z
    .string()
    .min(20, "El mensaje debe tener al menos 20 caracteres")
    .max(2000, "Máximo 2000 caracteres"),
});

type ContactoForm = z.infer<typeof contactoSchema>;

export default function ContactoPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactoForm>({
    resolver: zodResolver(contactoSchema),
  });

  const onSubmit = (data: ContactoForm) => {
    // construir cuerpo del correo con datos del formulario
    const cuerpo = [
      `Nombre: ${data.nombre}`,
      `Correo: ${data.email}`,
      "",
      data.mensaje,
    ].join("\n");

    // encodeURIComponent escapa espacios, saltos de linea y caracteres especiales
    const subject = encodeURIComponent(`[Contacto Web] ${data.asunto}`);
    const body = encodeURIComponent(cuerpo);
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    // abrir cliente de correo del usuario
    window.location.href = mailto;

    toast.success("Abriendo tu cliente de correo", {
      description: "Si no se abre automáticamente, escríbenos directamente a " + CONTACT_EMAIL,
    });
  };

  return (
    <>
      {/* hero */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Contacto
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Escríbenos tus dudas, comentarios o consultas sobre el programa.
          </p>
        </div>
      </section>

      {/* contenido: info + formulario */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* info de contacto */}
            <div className="lg:col-span-2">
              <div className="rounded-xl bg-secondary-50 p-6 ring-1 ring-secondary-200">
                <h2 className="font-heading text-lg font-semibold text-primary-800">
                  Información de contacto
                </h2>
                <p className="mt-2 text-sm text-secondary-600">
                  También puedes escribirnos directamente o visitarnos.
                </p>

                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
                        Correo
                      </p>
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-sm text-secondary-800 transition-colors hover:text-orange-600"
                      >
                        {CONTACT_EMAIL}
                      </a>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
                        Ubicación
                      </p>
                      <p className="text-sm text-secondary-800">La Paz, Bolivia</p>
                    </div>
                  </li>

                  <li className="flex items-start gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
                        Tiempo de respuesta
                      </p>
                      <p className="text-sm text-secondary-800">
                        Respondemos en 1 a 2 días hábiles
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* formulario */}
            <div className="lg:col-span-3">
              <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-secondary-200 sm:p-8">
                <h2 className="font-heading text-lg font-semibold text-secondary-900">
                  Envíanos un mensaje
                </h2>
                <p className="mt-1 text-sm text-secondary-500">
                  Al enviar se abrirá tu cliente de correo con el mensaje listo.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="nombre" className="text-secondary-700">
                      Nombre completo
                    </Label>
                    <Input
                      id="nombre"
                      type="text"
                      placeholder="Tu nombre"
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
                    <Label htmlFor="asunto" className="text-secondary-700">
                      Asunto
                    </Label>
                    <Input
                      id="asunto"
                      type="text"
                      placeholder="Consulta sobre convocatorias"
                      aria-invalid={!!errors.asunto}
                      aria-describedby={errors.asunto ? "asunto-error" : undefined}
                      {...register("asunto")}
                    />
                    {errors.asunto && (
                      <p id="asunto-error" className="text-sm text-error-600">
                        {errors.asunto.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="mensaje" className="text-secondary-700">
                      Mensaje
                    </Label>
                    <Textarea
                      id="mensaje"
                      rows={6}
                      placeholder="Cuéntanos tu consulta..."
                      aria-invalid={!!errors.mensaje}
                      aria-describedby={errors.mensaje ? "mensaje-error" : undefined}
                      {...register("mensaje")}
                    />
                    {errors.mensaje && (
                      <p id="mensaje-error" className="text-sm text-error-600">
                        {errors.mensaje.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-600 text-white hover:bg-orange-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="size-4" />
                        Enviar mensaje
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
