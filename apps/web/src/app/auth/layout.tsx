import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { PanelInscripcion } from "./_components/panel-inscripcion";

// Las pantallas de sesion no aportan nada en buscadores.
// Se permite el rastreo (robots.txt no las bloquea) para que el bot lea este noindex.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

// Layout split para auth (server component — sin useAuth para evitar loop).
// Lo comparten login, registro, verificar-cuenta y recuperar/restablecer password.
//
// La columna izquierda replica la pieza de campana que entrego el cliente
// (material/VF-Imagen-Inscripcion.png): panel navy con el mensaje y los
// beneficios, y la foto del apicultor pegada al borde derecho. El texto va sobre
// el navy y NUNCA sobre la foto, asi que se lee sin tener que oscurecer nada
// (antes habia que taparla con un degradado al 80% para llegar a contraste AA).
//
// La foto sale del arte del cliente, recortada a partir de x=1290: el titular
// impreso termina en x=1250, asi que ahi ya no queda ni un pixel de letra
// (verificado). Se usa esta y no la foto suelta del apicultor porque aquella es
// de 1040x780 y habria que AMPLIARLA para cubrir el alto de la pantalla: se veia
// borrosa. Esta tiene 2004px de alto, o sea se reduce, y queda nitida.
//
// La transicion al navy se hace con CSS (el arte la traia quemada en el pixel):
// asi se puede graduar, y no se parte cuando el recorte del contenedor la muerde,
// que era lo que dejaba una linea dura contra el fondo.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Columna izquierda: panel de campana (solo desktop) */}
      <div className="relative hidden overflow-hidden bg-primary-700 lg:block">
        {/* La foto es vertical (ratio 0.47) y llena el alto. Con este ancho la
            escala la manda el alto y el apicultor ocupa ~63% del bloque, la misma
            proporcion que en el arte del cliente */}
        <div className="absolute inset-y-0 right-0 w-[52%] xl:w-[50%]">
          <Image
            src="/images/auth-panel.webp"
            alt="Apicultor boliviano trabajando entre sus colmenas en la montaña"
            fill
            priority
            quality={90}
            sizes="(min-width: 1024px) 32vw, 0px"
            className="object-cover object-center"
          />
          {/* transicion suave hacia el navy: opaca solo en el borde y se abre
              pronto, para velar la foto lo menos posible */}
          <div className="absolute inset-y-0 left-0 w-[34%] bg-gradient-to-r from-primary-700 via-primary-700/35 to-transparent" />
        </div>

        <PanelInscripcion />
      </div>

      {/* Columna derecha: form */}
      <div className="flex min-h-screen flex-col bg-secondary-50">
        {/* En celular la columna izquierda no cabe: el mismo mensaje va arriba
            del formulario en version compacta, para no perder los premios */}
        <div className="lg:hidden">
          <PanelInscripcion compacto />
        </div>

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
          {/* el logo de celular ya viene en el panel compacto de arriba */}
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
