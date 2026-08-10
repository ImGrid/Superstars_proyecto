"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  createEmpresaSchema,
  OPCIONES_TIPO_EMPRESA,
  OPCIONES_NUMERO_SOCIOS,
  OPCIONES_RUBRO,
  OPCIONES_DEPARTAMENTO,
  OPCIONES_GENERO,
} from "@superstars/shared";
import type { CreateEmpresaDto, EmpresaResponse } from "@superstars/shared";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createEmpresa, updateMyEmpresa } from "@/lib/api/empresa.api";
import { empresaQueries } from "@/lib/api/query-keys";


// tipo para los valores del formulario
type EmpresaFormValues = CreateEmpresaDto;

// transforma null/undefined a valores para el formulario
function empresaToFormValues(emp: EmpresaResponse): EmpresaFormValues {
  return {
    razonSocial: emp.razonSocial,
    nit: emp.nit ?? undefined,
    registroSeprec: emp.registroSeprec ?? undefined,
    tipoEmpresa: emp.tipoEmpresa ?? undefined,
    numeroSocios: emp.numeroSocios ?? undefined,
    numEmpleadosMujeres: emp.numEmpleadosMujeres ?? undefined,
    numEmpleadosHombres: emp.numEmpleadosHombres ?? undefined,
    rubro: emp.rubro ?? undefined,
    anioFundacion: emp.anioFundacion ?? undefined,
    departamento: emp.departamento ?? undefined,
    ciudad: emp.ciudad ?? undefined,
    direccion: emp.direccion ?? undefined,
    telefono: emp.telefono ?? undefined,
    descripcion: emp.descripcion ?? undefined,
    contactoCargo: emp.contactoCargo ?? undefined,
    contactoTelefono: emp.contactoTelefono ?? undefined,
    contactoGenero: emp.contactoGenero ?? undefined,
    contactoFechaNacimiento: emp.contactoFechaNacimiento ?? undefined,
  };
}

// un campo se considera "lleno" si tiene valor real (los numeros 0 cuentan)
function lleno(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

// colores del icono de cada seccion (dentro de los tokens del sistema)
const COLORES_SECCION = {
  primary: "bg-primary-50 text-primary-600",
  info: "bg-info-50 text-info-600",
  purple: "bg-purple-50 text-purple-600",
} as const;

// cabecera de seccion: icono en cuadro de color + titulo + microcopy + estado
function SeccionHeader({
  icon,
  color,
  title,
  subtitle,
  faltan,
  mostrarEstado,
}: {
  icon: string;
  color: keyof typeof COLORES_SECCION;
  title: string;
  subtitle: string;
  faltan: number;
  mostrarEstado: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${COLORES_SECCION[color]}`}
      >
        <Icon icon={icon} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="mt-0.5">{subtitle}</CardDescription>
      </div>
      {/* El contador de datos faltantes solo tiene sentido cuando la empresa ya
          existe y se esta completando el perfil. Al registrarla por primera vez
          leia como "no puedes guardar hasta llenar todo" y la gente abandonaba,
          cuando en realidad basta la razon social. */}
      {!mostrarEstado ? null : faltan === 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">
          <Icon icon="ph:check-circle-duotone" className="size-3.5" />
          Completa
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700">
          <Icon icon="ph:warning-circle-duotone" className="size-3.5" />
          {faltan === 1 ? "Falta 1 dato" : `Faltan ${faltan} datos`}
        </span>
      )}
    </div>
  );
}

// etiqueta de campo con marca de obligatorio (*) u opcional
function Etiqueta({
  children,
  requerido,
}: {
  children: ReactNode;
  requerido?: boolean;
}) {
  return (
    <FormLabel className="flex items-center gap-1.5">
      <span>{children}</span>
      {requerido ? (
        <span className="text-error-600">*</span>
      ) : (
        <span className="text-[11px] font-normal text-secondary-400">
          (opcional)
        </span>
      )}
    </FormLabel>
  );
}

// campos que pertenecen a cada seccion (para el contador de "faltan")
const CAMPOS_CONTACTO = [
  "contactoCargo",
  "contactoTelefono",
  "contactoGenero",
  "contactoFechaNacimiento",
] as const;
const CAMPOS_LEGALES = [
  "razonSocial",
  "nit",
  "registroSeprec",
  "tipoEmpresa",
] as const;
const CAMPOS_GENERALES = [
  "numeroSocios",
  "rubro",
  "numEmpleadosMujeres",
  "numEmpleadosHombres",
  "anioFundacion",
  "departamento",
  "ciudad",
  "direccion",
  "telefono",
  "descripcion",
] as const;

interface EmpresaFormProps {
  initialData?: EmpresaResponse;
}

export function EmpresaForm({ initialData }: EmpresaFormProps) {
  const isEditing = !!initialData;
  const queryClient = useQueryClient();

  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(createEmpresaSchema),
    defaultValues: initialData
      ? empresaToFormValues(initialData)
      : {
          razonSocial: "",
          nit: undefined,
          registroSeprec: undefined,
          tipoEmpresa: undefined,
          numeroSocios: undefined,
          numEmpleadosMujeres: undefined,
          numEmpleadosHombres: undefined,
          rubro: undefined,
          anioFundacion: undefined,
          departamento: undefined,
          ciudad: undefined,
          direccion: undefined,
          telefono: undefined,
          descripcion: undefined,
          contactoCargo: undefined,
          contactoTelefono: undefined,
          contactoGenero: undefined,
          contactoFechaNacimiento: undefined,
        },
  });

  // pre-llenar el formulario cuando hay datos existentes
  useEffect(() => {
    if (initialData) {
      form.reset(empresaToFormValues(initialData));
    }
  }, [initialData, form]);

  // valores en vivo para el contador de datos faltantes de cada seccion
  const valores = form.watch();
  function faltanEn(campos: readonly string[]): number {
    return campos.filter((k) => !lleno((valores as Record<string, unknown>)[k]))
      .length;
  }

  // mutacion crear
  const createMutation = useMutation({
    mutationFn: createEmpresa,
    onSuccess: () => {
      toast.success("Empresa registrada correctamente");
      queryClient.invalidateQueries({ queryKey: empresaQueries.all() });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al registrar la empresa";
      toast.error(msg);
    },
  });

  // mutacion editar
  const updateMutation = useMutation({
    mutationFn: updateMyEmpresa,
    onSuccess: () => {
      toast.success("Empresa actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: empresaQueries.all() });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message ?? "Error al actualizar la empresa";
      toast.error(msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // limpia strings vacios a undefined para no sobreescribir datos en la BD
  function cleanFormValues(values: EmpresaFormValues): EmpresaFormValues {
    const cleaned = { ...values };

    // campos de texto opcionales: "" -> undefined
    const textFields = [
      "nit", "registroSeprec", "tipoEmpresa", "numeroSocios", "rubro",
      "departamento", "ciudad", "direccion", "telefono", "descripcion",
      "contactoCargo", "contactoTelefono", "contactoGenero",
      "contactoFechaNacimiento",
    ] as const;

    for (const key of textFields) {
      if ((cleaned as Record<string, unknown>)[key] === "") {
        (cleaned as Record<string, unknown>)[key] = undefined;
      }
    }

    return cleaned;
  }

  function onSubmit(values: EmpresaFormValues) {
    const cleaned = cleanFormValues(values);
    if (isEditing) {
      updateMutation.mutate(cleaned);
    } else {
      createMutation.mutate(cleaned);
    }
  }

  return (
    <Form {...form}>
      <form
        id="datos-empresa"
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 scroll-mt-6"
      >
        {/* seccion 1: persona de contacto */}
        <Card>
          <CardHeader>
            <SeccionHeader
              icon="ph:user-circle-duotone"
              color="primary"
              title="Persona de contacto"
              subtitle="¿Con quién nos comunicamos sobre tus postulaciones?"
              faltan={faltanEn(CAMPOS_CONTACTO)}
              mostrarEstado={isEditing}
            />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactoCargo"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Puesto/Cargo</Etiqueta>
                  <FormControl>
                    <Input placeholder="Cargo en la empresa" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoTelefono"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Teléfono de contacto</Etiqueta>
                  <FormControl>
                    <Input placeholder="Número de contacto" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    Solo lo usamos para avisarte del resultado de tu postulación.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoGenero"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Género</Etiqueta>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_GENERO.map((g) => (
                        <SelectItem key={g.valor} value={g.valor}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoFechaNacimiento"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Fecha de nacimiento</Etiqueta>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* seccion 2: datos legales */}
        <Card>
          <CardHeader>
            <SeccionHeader
              icon="ph:shield-check-duotone"
              color="info"
              title="Datos legales"
              subtitle="Con estos datos validamos que tu empresa cumple los requisitos."
              faltan={faltanEn(CAMPOS_LEGALES)}
              mostrarEstado={isEditing}
            />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="razonSocial"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta requerido>Razón social</Etiqueta>
                  <FormControl>
                    <Input placeholder="Nombre registrado jurídicamente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nit"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>NIT</Etiqueta>
                  <FormControl>
                    <Input
                      placeholder="Número de identificación tributaria"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Puedes completarlo después; no es obligatorio para registrarte.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registroSeprec"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Registro SEPREC</Etiqueta>
                  <FormControl>
                    <Input placeholder="Número de registro" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipoEmpresa"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Tipo de empresa</Etiqueta>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_TIPO_EMPRESA.map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* seccion 3: datos generales */}
        <Card>
          <CardHeader>
            <SeccionHeader
              icon="ph:buildings-duotone"
              color="purple"
              title="Datos generales"
              subtitle="Cuéntanos de tu empresa para que el jurado te conozca mejor."
              faltan={faltanEn(CAMPOS_GENERALES)}
              mostrarEstado={isEditing}
            />
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="numeroSocios"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Número de socios</Etiqueta>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_NUMERO_SOCIOS.map((n) => (
                        <SelectItem key={n.valor} value={n.valor}>{n.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rubro"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Rubro o sector</Etiqueta>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar rubro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_RUBRO.map((r) => (
                        <SelectItem key={r.valor} value={r.valor}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numEmpleadosMujeres"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Empleadas mujeres</Etiqueta>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numEmpleadosHombres"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Empleados hombres</Etiqueta>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="anioFundacion"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Año de fundación</Etiqueta>
                  <FormControl>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear()}
                      placeholder="Ej: 2015"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? undefined : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="departamento"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Departamento</Etiqueta>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar departamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OPCIONES_DEPARTAMENTO.map((d) => (
                        <SelectItem key={d.valor} value={d.valor}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ciudad"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Ciudad</Etiqueta>
                  <FormControl>
                    <Input placeholder="Ciudad donde opera" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Dirección</Etiqueta>
                  <FormControl>
                    <Input placeholder="Dirección de la empresa" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <Etiqueta>Teléfono</Etiqueta>
                  <FormControl>
                    <Input placeholder="Número de teléfono" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <Etiqueta>Descripción de la empresa</Etiqueta>
                  <FormControl>
                    <Textarea
                      placeholder="Explique brevemente a qué se dedica su empresa, qué necesidad atiende en el mercado y qué propuesta innovadora ofrece. (Máximo 200 palabras)"
                      rows={4}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Cuéntale al jurado a qué se dedica tu empresa y qué la hace especial.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* boton submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} size="lg">
            {isLoading && <Loader2 className="animate-spin" />}
            <Save className="size-4" />
            {isEditing ? "Guardar cambios" : "Registrar empresa"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
