import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

// Layout split 50/50 para auth (server component — sin useAuth para evitar loop).
// Columna izquierda: imagen del Salar de Uyuni con overlay de branding.
// Solo visible en desktop (lg+); en mobile/tablet colapsa a single column con
// el form ocupando todo el ancho.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Columna izquierda: imagen + branding overlay (solo desktop) */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/salar_uyuni.webp"
          alt="Salar de Uyuni, Bolivia"
          fill
          priority
          quality={85}
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover"
        />
        {/* Gradient sutil para que el branding y el copy sean legibles
            sobre el cielo y el reflejo de la imagen */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-primary-900/15 to-primary-900/55" />

        {/* Branding superior + copy inferior */}
        <div className="relative z-10 flex h-full flex-col p-10 xl:p-12">
          <Link
            href="/"
            className="font-heading text-2xl font-bold tracking-tight text-white drop-shadow-md transition-opacity hover:opacity-90"
          >
            SUPERIMPACT360
          </Link>

          <div className="mt-auto max-w-md">
            <p className="font-heading text-3xl font-bold leading-tight text-white drop-shadow-lg xl:text-4xl">
              Empresas con impacto,<br />
              transformando Bolivia.
            </p>
            <p className="mt-3 text-sm text-white/90 drop-shadow xl:text-base">
              Plataforma de competencias empresariales para impulsar tu negocio.
            </p>
          </div>
        </div>
      </div>

      {/* Columna derecha: form */}
      <div className="flex min-h-screen flex-col bg-secondary-50">
        {/* Header con "Volver al inicio" */}
        <div className="px-4 pt-6 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-secondary-500 transition-colors hover:text-primary-700"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
        </div>

        {/* Form centrado verticalmente en su columna */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-md">
            {/* Branding visible solo en mobile/tablet (en desktop esta sobre la imagen) */}
            <Link
              href="/"
              className="mb-6 block text-center font-heading text-[1.75rem] font-bold tracking-tight text-primary-600 transition-colors hover:text-primary-700 lg:hidden"
            >
              SUPERIMPACT360
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
