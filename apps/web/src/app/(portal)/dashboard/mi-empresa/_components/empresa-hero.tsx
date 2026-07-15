"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@iconify/react";
import {
  OPCIONES_RUBRO,
  OPCIONES_DEPARTAMENTO,
} from "@superstars/shared";
import type { EmpresaResponse } from "@superstars/shared";
import { getOpcionLabel } from "@/lib/opciones";
import {
  getEmpresaLogoUrl,
  uploadMyLogo,
  removeMyLogo,
} from "@/lib/api/empresa.api";
import { empresaQueries } from "@/lib/api/query-keys";
import { validateImageFile, IMAGE_INPUT_ACCEPT } from "@/lib/image-validation";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

// campos del perfil que cuentan para la completitud, en el orden en que aparecen
// en el formulario (contacto -> legales -> generales)
const CAMPOS_PERFIL: { key: keyof EmpresaResponse; label: string }[] = [
  { key: "contactoCargo", label: "Puesto / Cargo" },
  { key: "contactoTelefono", label: "Teléfono de contacto" },
  { key: "contactoGenero", label: "Género" },
  { key: "contactoFechaNacimiento", label: "Fecha de nacimiento" },
  { key: "razonSocial", label: "Razón social" },
  { key: "nit", label: "NIT" },
  { key: "registroSeprec", label: "Registro SEPREC" },
  { key: "tipoEmpresa", label: "Tipo de empresa" },
  { key: "numeroSocios", label: "Número de socios" },
  { key: "rubro", label: "Rubro o sector" },
  { key: "numEmpleadosMujeres", label: "Empleadas mujeres" },
  { key: "numEmpleadosHombres", label: "Empleados hombres" },
  { key: "anioFundacion", label: "Año de fundación" },
  { key: "departamento", label: "Departamento" },
  { key: "ciudad", label: "Ciudad" },
  { key: "direccion", label: "Dirección" },
  { key: "telefono", label: "Teléfono" },
  { key: "descripcion", label: "Descripción de la empresa" },
];

// un campo esta "lleno" si tiene valor (los numeros pueden ser 0 y cuentan)
function tieneValor(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

// iniciales de la razon social para el avatar (hasta 2 letras)
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

// pastilla de metadato del hero (rubro / departamento)
function HeroChip({ icon, texto }: { icon: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs text-white">
      <Icon icon={icon} className="size-3.5" />
      {texto}
    </span>
  );
}

export function EmpresaHero({ empresa }: { empresa: EmpresaResponse }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);

  const faltantes = CAMPOS_PERFIL.filter((c) => !tieneValor(empresa[c.key]));
  const llenos = CAMPOS_PERFIL.length - faltantes.length;
  const pct = Math.round((llenos / CAMPOS_PERFIL.length) * 100);
  const completo = faltantes.length === 0;

  // verificada si tiene NIT o registro SEPREC (datos legales oficiales)
  const verificada = tieneValor(empresa.nit) || tieneValor(empresa.registroSeprec);

  // URL del logo. El query string con el logoKey fuerza al navegador a refrescar
  // su cache cuando el logo cambia (mismo id de empresa pero archivo distinto).
  const logoUrl = empresa.logoKey
    ? `${getEmpresaLogoUrl(empresa.id)}?v=${encodeURIComponent(empresa.logoKey)}`
    : null;

  function invalidarEmpresa() {
    queryClient.invalidateQueries({ queryKey: empresaQueries.me().queryKey });
    queryClient.invalidateQueries({ queryKey: empresaQueries.all() });
  }

  const subirMutation = useMutation({
    mutationFn: (file: File) => uploadMyLogo(file),
    onSuccess: () => {
      toast.success("El logo se guardó correctamente.");
      invalidarEmpresa();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "No se pudo guardar el logo. Intenta de nuevo.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  const quitarMutation = useMutation({
    mutationFn: () => removeMyLogo(),
    onSuccess: () => {
      toast.success("El logo se quitó correctamente.");
      setConfirmarQuitar(false);
      invalidarEmpresa();
    },
    onError: (error: any) => {
      const msg =
        error?.response?.data?.message ??
        "No se pudo quitar el logo. Intenta de nuevo.";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setConfirmarQuitar(false);
    },
  });

  const procesando = subirMutation.isPending || quitarMutation.isPending;

  function onElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // reset para poder volver a elegir el mismo archivo despues
    e.target.value = "";
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    subirMutation.mutate(file);
  }

  const rubroLabel = empresa.rubro
    ? getOpcionLabel(empresa.rubro, OPCIONES_RUBRO)
    : null;
  const departamentoLabel = empresa.departamento
    ? getOpcionLabel(empresa.departamento, OPCIONES_DEPARTAMENTO)
    : null;

  return (
    <div className="space-y-4">
      {/* hero de identidad de la empresa */}
      <div
        className="overflow-hidden rounded-2xl shadow-sm"
        style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-info-600))" }}
      >
        <div className="flex flex-col md:flex-row md:items-stretch">
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_INPUT_ACCEPT}
            className="hidden"
            onChange={onElegirArchivo}
          />

          {/* logo a sangre: cubre toda la altura de la franja. Los logos son
              cuadrados, asi que object-cover los adapta sin deformarlos */}
          <div className="group relative h-40 w-full shrink-0 bg-white md:h-auto md:w-44">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={procesando}
              aria-label={logoUrl ? "Cambiar logo" : "Subir logo"}
              className="block size-full disabled:opacity-70"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`Logo de ${empresa.razonSocial}`}
                  className="size-full object-cover"
                />
              ) : (
                <span
                  className="flex size-full items-center justify-center font-heading text-5xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-purple-600), var(--color-purple-800))" }}
                >
                  {iniciales(empresa.razonSocial)}
                </span>
              )}
            </button>

            {/* afordancia de subida: badge de camara (o spinner mientras procesa) */}
            <span className="pointer-events-none absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-full bg-white text-primary-700 shadow ring-2 ring-primary-600">
              <Icon
                icon={procesando ? "ph:spinner-gap-duotone" : "ph:camera-duotone"}
                className={procesando ? "size-4 animate-spin" : "size-4"}
              />
            </span>

            {/* quitar logo: solo cuando hay logo, aparece al pasar el cursor */}
            {logoUrl && !procesando && (
              <button
                type="button"
                onClick={() => setConfirmarQuitar(true)}
                aria-label="Quitar logo"
                className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-error-600 text-white opacity-0 shadow transition group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Icon icon="ph:x-bold" className="size-3" />
              </button>
            )}
          </div>

          {/* identidad de la empresa */}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-bold text-white">
                {empresa.razonSocial}
              </h2>
              {verificada && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                  <Icon icon="ph:seal-check-duotone" className="size-3.5" />
                  Verificada
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {rubroLabel && (
                <HeroChip icon="ph:briefcase-duotone" texto={rubroLabel} />
              )}
              {departamentoLabel && (
                <HeroChip icon="ph:map-pin-duotone" texto={departamentoLabel} />
              )}
            </div>

            <p className="max-w-prose text-xs text-white/85">
              {logoUrl ? (
                <>
                  Este es el perfil de tu empresa. Con él te presentas ante los
                  evaluadores de cada convocatoria.
                </>
              ) : (
                <>
                  Sube el logo de tu empresa para que te reconozcan. Toca el
                  recuadro morado y elige una imagen.
                </>
              )}
            </p>
          </div>

          {/* estado del perfil: ocupa el espacio que antes quedaba vacio.
              Si falta algo, guia; si esta completo, invita a postularse */}
          <div className="flex w-full shrink-0 flex-col justify-center gap-2.5 border-t border-white/15 bg-white/[0.07] p-5 md:w-[344px] md:border-l md:border-t-0">
            {completo ? (
              <>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-success-600 text-white">
                    <Icon icon="ph:check-bold" className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-white">
                      Tu empresa está lista para competir
                    </p>
                    <p className="text-[11.5px] text-white/70">
                      Perfil completo · 100%
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/convocatorias"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amarillo-600 px-4 py-2.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-amarillo-500"
                >
                  Ver convocatorias abiertas
                  <Icon icon="ph:arrow-right-bold" className="size-4" />
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs text-white/80">Tu perfil está al</span>
                  <span className="font-heading text-xl font-bold tabular-nums text-white">
                    {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-warning-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11.5px] text-white/75">
                  <span className="font-semibold text-white">
                    Te {faltantes.length === 1 ? "falta" : "faltan"}{" "}
                    {faltantes.length} {faltantes.length === 1 ? "dato" : "datos"}
                  </span>{" "}
                  — un perfil completo mejora tus postulaciones:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {faltantes.slice(0, 4).map((f) => (
                    <span
                      key={f.key as string}
                      className="rounded-md border border-white/25 bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white"
                    >
                      {f.label}
                    </span>
                  ))}
                  {faltantes.length > 4 && (
                    <span className="px-1 py-0.5 text-[11px] text-white/60">
                      +{faltantes.length - 4} más
                    </span>
                  )}
                </div>
                <a
                  href="#datos-empresa"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25"
                >
                  Completar mi perfil
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmarQuitar}
        onOpenChange={(open) => !open && setConfirmarQuitar(false)}
        title="Quitar logo"
        description="Tu perfil volverá a mostrarse con las iniciales de tu empresa. Podrás subir otro logo más adelante."
        confirmLabel="Quitar"
        onConfirm={() => quitarMutation.mutate()}
        isLoading={quitarMutation.isPending}
      />
    </div>
  );
}
