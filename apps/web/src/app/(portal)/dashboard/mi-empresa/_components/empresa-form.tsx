"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
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
    nit: emp.nit,
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
          nit: "",
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
      "registroSeprec", "tipoEmpresa", "numeroSocios", "rubro",
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* seccion 1: persona de contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Persona de contacto</CardTitle>
            <CardDescription>
              Datos de la persona que realiza la postulacion.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactoCargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Puesto/Cargo</FormLabel>
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
                  <FormLabel>Telefono de contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero de contacto" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactoGenero"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Genero</FormLabel>
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
                  <FormLabel>Fecha de nacimiento</FormLabel>
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
            <CardTitle>Datos legales</CardTitle>
            <CardDescription>
              Informacion juridica de la empresa.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="razonSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razon social *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre registrado juridicamente" {...field} />
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
                  <FormLabel>NIT *</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero de identificacion tributaria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registroSeprec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registro SEPREC</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero de registro" {...field} value={field.value ?? ""} />
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
                  <FormLabel>Tipo de empresa</FormLabel>
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
            <CardTitle>Datos generales</CardTitle>
            <CardDescription>
              Informacion sobre la empresa, su ubicacion y actividad.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="numeroSocios"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero de socios</FormLabel>
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
                  <FormLabel>Rubro o sector</FormLabel>
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
                  <FormLabel>Empleadas mujeres</FormLabel>
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
                  <FormLabel>Empleados hombres</FormLabel>
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
                  <FormLabel>Ano de fundacion</FormLabel>
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
                  <FormLabel>Departamento</FormLabel>
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
                  <FormLabel>Ciudad</FormLabel>
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
                  <FormLabel>Direccion</FormLabel>
                  <FormControl>
                    <Input placeholder="Direccion de la empresa" {...field} value={field.value ?? ""} />
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
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="Numero de telefono" {...field} value={field.value ?? ""} />
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
                  <FormLabel>Descripcion de la empresa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explique brevemente a que se dedica su empresa, que necesidad atiende en el mercado y que propuesta innovadora ofrece. (Maximo 200 palabras)"
                      rows={4}
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
