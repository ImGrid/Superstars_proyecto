import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

// Las pantallas de sesion no aportan nada en buscadores.
// Se permite el rastreo (robots.txt no las bloquea) para que el bot lea este noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

// Layout split 50/50 para auth (server component — sin useAuth para evitar loop).
// Lo comparten login, registro, verificar-cuenta y recuperar/restablecer password.
// Columna izquierda: foto del apicultor con overlay de branding.
// Solo visible en desktop (lg+); en mobile/tablet colapsa a single column con
// el form ocupando todo el ancho.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Columna izquierda: imagen + branding overlay (solo desktop) */}
      <div className="relative hidden lg:block">
        <Image
          src="/images/auth-apicultor.webp"
          alt="Apicultor boliviano trabajando entre sus colmenas en la montaña"
          fill
          priority
          quality={85}
          sizes="(min-width: 1024px) 50vw, 0px"
          className="object-cover"
        />
        {/* La foto es clara (cielo y follaje al sol) y el texto va en blanco:
            oscurecemos arriba (branding) y abajo (copy), y dejamos limpia la
            franja del medio para que se vea la cara del apicultor.
            Medido: con overlay al 20% el branding daba 2.6:1 y no cumplia AA. */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/80 via-38% via-primary-900/12 to-primary-900/90" />

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
