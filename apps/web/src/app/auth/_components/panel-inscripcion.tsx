"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";

// Contenido del panel de bienvenida de las pantallas de sesion, calcado de la
// pieza que entrego el cliente (material/VF-Imagen-Inscripcion.png). El acento
// naranja del arte original se traduce al amarillo oficial de marca, que es el
// color de accion de la paleta y el que mejor contrasta sobre el navy.
//
// Los datos (edicion, ganadores, montos) son fijos a proposito: es la pieza de
// campana del ano. Al ir en HTML y no en una imagen, cambiarlos el proximo anio
// es editar este archivo.
const BENEFICIOS = [
  {
    icono: "ph:trophy",
    titulo: "3 empresas ganadoras",
    detalle: "por categoría",
  },
  {
    icono: "tabler:moneybag",
    titulo: "Subvención para tu empresa",
    // dos montos, uno por categoria: se muestran juntos como en el arte
    montos: [
      { categoria: "Categoría 1", monto: "Bs 50.000" },
      { categoria: "Categoría 2", monto: "Bs 35.000" },
    ],
  },
  {
    icono: "ph:star",
    titulo: "5.ª edición",
    detalle: "del programa SuperStar",
  },
];

// icono dentro de un circulo de trazo, como en el arte del cliente
function IconoCirculo({ icono, tamano }: { icono: string; tamano: "sm" | "lg" }) {
  const caja = tamano === "lg" ? "size-16 xl:size-[4.5rem]" : "size-11";
  const glifo = tamano === "lg" ? "size-8 xl:size-9" : "size-6";

  return (
    <span
      className={`flex ${caja} shrink-0 items-center justify-center rounded-full border-2 border-amarillo-600 text-amarillo-600`}
    >
      <Icon icon={icono} className={glifo} />
    </span>
  );
}

export function PanelInscripcion({ compacto = false }: { compacto?: boolean }) {
  // version compacta: celular, encima del formulario
  if (compacto) {
    return (
      <div className="bg-primary-700 px-5 py-7 text-white">
        <Link href="/" className="mb-5 flex items-center gap-2">
          <Image
            src="/images/cohete-hd.png"
            alt=""
            width={28}
            height={28}
            className="size-7 object-contain"
          />
          <span className="font-heading text-lg font-bold tracking-tight">
            SUPERIMPACT360
          </span>
        </Link>

        <h2 className="font-heading text-2xl leading-tight font-bold">
          Comienza tu{" "}
          <span className="text-amarillo-600">postulación</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/85">
          Postula a la{" "}
          <span className="font-semibold text-amarillo-600">
            5.ª edición de SuperStar
          </span>{" "}
          y haz crecer tu empresa.
        </p>

        <ul className="mt-5 space-y-3.5">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex items-center gap-3">
              <IconoCirculo icono={b.icono} tamano="sm" />
              <div className="min-w-0 text-sm leading-snug">
                <p className="font-semibold">{b.titulo}</p>
                {b.detalle && <p className="text-white/80">{b.detalle}</p>}
                {b.montos && (
                  <p className="text-white/80">
                    {b.montos.map((m, i) => (
                      <span key={m.categoria}>
                        {i > 0 && <span className="mx-1.5 text-white/40">|</span>}
                        <span className="font-semibold text-amarillo-600">
                          {m.monto}
                        </span>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // version de escritorio: ocupa la columna izquierda completa
  return (
    <div className="relative z-10 flex h-full max-w-[25rem] flex-col justify-center gap-6 p-8 xl:max-w-[28rem] xl:gap-8 xl:p-11">
      <Link
        href="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
      >
        <Image
          src="/images/cohete-hd.png"
          alt=""
          width={40}
          height={40}
          className="size-9 object-contain xl:size-10"
        />
        <span className="font-heading text-xl font-bold tracking-tight text-white xl:text-2xl">
          SUPERIMPACT360
        </span>
      </Link>

      <div>
        <h2 className="font-heading text-4xl leading-[1.1] font-bold text-white xl:text-5xl">
          Comienza tu
          <br />
          <span className="text-amarillo-600">postulación</span>
        </h2>
        <p className="mt-5 text-base leading-relaxed text-white/90 xl:text-lg">
          Postula a la{" "}
          <span className="font-semibold text-amarillo-600">
            5.ª edición de SuperStar
          </span>{" "}
          y haz crecer tu empresa.
        </p>
      </div>

      <ul className="space-y-6 xl:space-y-7">
        {BENEFICIOS.map((b) => (
          <li key={b.titulo} className="flex items-center gap-4 xl:gap-5">
            <IconoCirculo icono={b.icono} tamano="lg" />
            <div className="min-w-0">
              <p className="font-heading text-base font-bold text-white xl:text-lg">
                {b.titulo}
              </p>
              {b.detalle && (
                <p className="text-sm text-white/85 xl:text-base">{b.detalle}</p>
              )}
              {b.montos && (
                <div className="mt-1 flex items-center gap-3 xl:gap-4">
                  {b.montos.map((m, i) => (
                    <div key={m.categoria} className="flex items-center gap-3 xl:gap-4">
                      {i > 0 && (
                        <span className="h-8 w-px bg-white/25" aria-hidden="true" />
                      )}
                      <div>
                        <p className="text-xs text-white/80 xl:text-sm">
                          {m.categoria}
                        </p>
                        <p className="font-heading text-lg font-bold text-amarillo-600 xl:text-xl">
                          {m.monto}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
