"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StateBadge } from "@/components/shared/state-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  empresaQueries,
  usuarioQueries,
  postulacionQueries,
} from "@/lib/api/query-keys";
import { formatDate, formatShortDate, formatPercent } from "@/lib/format";
import { getOpcionLabel } from "@/lib/opciones";
import {
  OPCIONES_DEPARTAMENTO,
  OPCIONES_RUBRO,
  OPCIONES_TIPO_EMPRESA,
  OPCIONES_NUMERO_SOCIOS,
  OPCIONES_GENERO,
} from "@superstars/shared";

// Helper: muestra "—" en gris para campos opcionales vacios.
// Mantiene la pagina compacta sin texto largo tipo "No especificado".
function dash(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-secondary-300">—</span>;
  }
  return value;
}

// Componente compacto label-valor en grid de 2 columnas.
// Usado en todas las secciones para mantener consistencia visual y densidad.
function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-3 py-1.5 text-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-secondary-500">
        {label}
      </dt>
      <dd className="text-secondary-900">{value}</dd>
    </div>
  );
}

interface EmpresaDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EmpresaDetailPage({ params }: EmpresaDetailPageProps) {
  const { id } = use(params);
  const empresaId = Number(id);
  const router = useRouter();

  const { data: empresa, isLoading, isError } = useQuery(
    empresaQueries.detail(empresaId),
  );

  // Cargando
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-96" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Error o no existe
  if (isError || !empresa) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            No se pudo cargar la empresa. Verifica el enlace.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/empresas")}
        >
          <ArrowLeft className="size-4" />
          Volver a empresas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header: razon social + identificacion rapida (NIT, rubro, departamento) */}
      <EmpresaHeader empresa={empresa} />

      {/* Datos legales + Datos generales en grid 2-col */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DatosLegalesCard empresa={empresa} />
        <DatosGeneralesCard empresa={empresa} />
      </div>

      {/* Ubicacion y contacto comercial (full width) */}
      <UbicacionContactoCard empresa={empresa} />

      {/* Descripcion (solo si existe) */}
      {empresa.descripcion && <DescripcionCard descripcion={empresa.descripcion} />}

      {/* Persona de contacto + cuenta vinculada del proponente */}
      <PersonaContactoCard empresa={empresa} />

      {/* Postulaciones recientes (informacion secundaria) */}
      <PostulacionesEmpresaCard empresaId={empresa.id} />
    </div>
  );
}

// --- Header con identificacion rapida ---

function EmpresaHeader({
  empresa,
}: {
  empresa: { id: number; razonSocial: string; nit: string | null; rubro: string | null; departamento: string | null };
}) {
  // Datos compactos en una sola linea separados por punto medio (·).
  // Mostramos solo los que existen para no contaminar con guiones.
  // Mapeamos slugs a labels para que se vea "La Paz" en lugar de "la_paz".
  const meta = [
    empresa.nit ? `NIT ${empresa.nit}` : null,
    getOpcionLabel(empresa.rubro, OPCIONES_RUBRO),
    getOpcionLabel(empresa.departamento, OPCIONES_DEPARTAMENTO),
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1 text-secondary-500">
        <Link href="/dashboard/empresas">
          <ArrowLeft className="size-4" />
          Empresas
        </Link>
      </Button>
      <div>
        <h1 className="font-heading text-2xl font-bold text-secondary-900">
          {empresa.razonSocial}
        </h1>
        {meta.length > 0 && (
          <p className="mt-1 text-sm text-secondary-500">
            {meta.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// --- Datos legales ---

function DatosLegalesCard({
  empresa,
}: {
  empresa: {
    razonSocial: string;
    nit: string | null;
    registroSeprec: string | null;
    tipoEmpresa: string | null;
  };
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:identification-card-duotone" className="size-5 text-primary-600" />
          Datos legales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-secondary-100">
          <InfoRow label="Razón social" value={empresa.razonSocial} />
          <InfoRow label="NIT" value={dash(empresa.nit)} />
          <InfoRow label="Registro SEPREC" value={dash(empresa.registroSeprec)} />
          <InfoRow
            label="Tipo de empresa"
            value={dash(getOpcionLabel(empresa.tipoEmpresa, OPCIONES_TIPO_EMPRESA))}
          />
        </dl>
      </CardContent>
    </Card>
  );
}

// --- Datos generales ---

function DatosGeneralesCard({
  empresa,
}: {
  empresa: {
    rubro: string | null;
    anioFundacion: number | null;
    numeroSocios: string | null;
    numEmpleadosMujeres: number | null;
    numEmpleadosHombres: number | null;
  };
}) {
  // Empleados: mostrar el total y el desglose por genero si hay al menos uno.
  const totalEmpleados =
    (empresa.numEmpleadosMujeres ?? 0) + (empresa.numEmpleadosHombres ?? 0);
  const tieneEmpleados =
    empresa.numEmpleadosMujeres !== null || empresa.numEmpleadosHombres !== null;
  const empleadosTexto = tieneEmpleados ? (
    <span>
      {totalEmpleados}{" "}
      <span className="text-secondary-500 text-xs">
        ({empresa.numEmpleadosMujeres ?? 0} M · {empresa.numEmpleadosHombres ?? 0} H)
      </span>
    </span>
  ) : (
    dash(null)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:factory-duotone" className="size-5 text-primary-600" />
          Datos generales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-secondary-100">
          <InfoRow
            label="Rubro"
            value={dash(getOpcionLabel(empresa.rubro, OPCIONES_RUBRO))}
          />
          <InfoRow label="Año de fundación" value={dash(empresa.anioFundacion)} />
          <InfoRow
            label="Número de socios"
            value={dash(getOpcionLabel(empresa.numeroSocios, OPCIONES_NUMERO_SOCIOS))}
          />
          <InfoRow label="Empleados" value={empleadosTexto} />
        </dl>
      </CardContent>
    </Card>
  );
}

// --- Ubicacion + contacto comercial ---

function UbicacionContactoCard({
  empresa,
}: {
  empresa: {
    departamento: string | null;
    ciudad: string | null;
    direccion: string | null;
    telefono: string | null;
  };
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:map-pin-duotone" className="size-5 text-primary-600" />
          Ubicación y contacto comercial
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Grid 2-col en desktop para densidad, 1 col en mobile */}
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <dl className="divide-y divide-secondary-100">
            <InfoRow
              label="Departamento"
              value={dash(getOpcionLabel(empresa.departamento, OPCIONES_DEPARTAMENTO))}
            />
            <InfoRow label="Ciudad" value={dash(empresa.ciudad)} />
          </dl>
          <dl className="divide-y divide-secondary-100">
            <InfoRow label="Teléfono" value={dash(empresa.telefono)} />
            <InfoRow label="Dirección" value={dash(empresa.direccion)} />
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Descripcion ---

function DescripcionCard({ descripcion }: { descripcion: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:note-duotone" className="size-5 text-primary-600" />
          Descripción
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line text-sm leading-relaxed text-secondary-700">
          {descripcion}
        </p>
      </CardContent>
    </Card>
  );
}

// --- Persona de contacto + cuenta vinculada ---

function PersonaContactoCard({
  empresa,
}: {
  empresa: {
    usuarioId: number;
    contactoCargo: string | null;
    contactoTelefono: string | null;
    contactoGenero: string | null;
    contactoFechaNacimiento: string | null;
  };
}) {
  // Carga los datos del usuario proponente que registro la empresa.
  // Si falla (ej: usuario eliminado), no rompe la pagina, solo omite la fila.
  const { data: usuario } = useQuery(usuarioQueries.detail(empresa.usuarioId));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:user-circle-duotone" className="size-5 text-primary-600" />
          Persona de contacto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <dl className="divide-y divide-secondary-100">
            <InfoRow label="Cargo" value={dash(empresa.contactoCargo)} />
            <InfoRow label="Teléfono" value={dash(empresa.contactoTelefono)} />
          </dl>
          <dl className="divide-y divide-secondary-100">
            <InfoRow
              label="Género"
              value={dash(getOpcionLabel(empresa.contactoGenero, OPCIONES_GENERO))}
            />
            <InfoRow
              label="Fecha de nacimiento"
              value={
                empresa.contactoFechaNacimiento
                  ? formatDate(empresa.contactoFechaNacimiento)
                  : dash(null)
              }
            />
          </dl>
        </div>
        {usuario && (
          <div className="mt-3 border-t border-secondary-100 pt-3">
            <dl className="divide-y divide-secondary-100">
              <InfoRow
                label="Cuenta vinculada"
                value={
                  <span>
                    {usuario.email}{" "}
                    <span className="text-secondary-500 text-xs">
                      ({usuario.nombre})
                    </span>
                  </span>
                }
              />
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Postulaciones recientes (info secundaria) ---

function PostulacionesEmpresaCard({ empresaId }: { empresaId: number }) {
  // Solo trae las 5 mas recientes para la vista resumida. El boton "Ver todas"
  // lleva a la pagina de postulaciones con el filtro empresaId aplicado.
  const { data, isLoading } = useQuery(
    postulacionQueries.adminList({ empresaId, page: 1, limit: 5 }),
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Postulaciones de esta empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data?.total ?? 0;
  const postulaciones = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon icon="ph:paper-plane-tilt-duotone" className="size-5 text-primary-600" />
          Postulaciones de esta empresa
          {total > 0 && (
            <span className="ml-1 text-sm font-normal text-secondary-500">
              ({total})
            </span>
          )}
        </CardTitle>
        {total > postulaciones.length && (
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-primary-700">
            <Link href={`/dashboard/postulaciones?empresaId=${empresaId}`}>
              Ver todas
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {postulaciones.length === 0 ? (
          <EmptyState
            icon="ph:paper-plane-tilt-duotone"
            title="Sin postulaciones"
            description="Esta empresa aún no se ha postulado a ninguna convocatoria."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convocatoria</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Completado</TableHead>
                  <TableHead>Enviada</TableHead>
                  <TableHead className="text-right">Puntaje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {postulaciones.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.convocatoriaNombre}</TableCell>
                    <TableCell>
                      <StateBadge tipo="postulacion" valor={p.estado} />
                    </TableCell>
                    <TableCell className="text-sm text-secondary-600">
                      {formatPercent(p.porcentajeCompletado)}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-500">
                      {p.fechaEnvio ? formatShortDate(p.fechaEnvio) : dash(null)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-secondary-900">
                      {p.puntajeFinal ? Number(p.puntajeFinal).toFixed(2) : dash(null)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
