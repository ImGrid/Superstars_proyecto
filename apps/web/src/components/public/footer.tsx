import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { SponsorsStrip } from "@/components/public/sponsors-strip";

const quickLinks = [
  { label: "Inicio", href: "/" },
  { label: "Convocatorias", href: "/convocatorias" },
  { label: "Noticias", href: "/noticias" },
  { label: "Resultados", href: "/resultados" },
  { label: "FAQ", href: "/faq" },
  { label: "Contacto", href: "/contacto" },
];

const legalLinks = [
  { label: "Bases de la convocatoria", href: "/convocatorias" },
  { label: "Acceso Empresas", href: "/auth/login" },
  { label: "Registro", href: "/auth/registro" },
];

export function PublicFooter() {
  return (
    <footer className="bg-primary-800 text-primary-100">
      {/* sponsors - banda navy con logos reales */}
      <SponsorsStrip variant="footer" />

      {/* contenido principal */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* col 1: logo + descripcion */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <span className="font-heading text-xl font-bold tracking-tight text-white">
                SUPERIMPACT360
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-primary-300">
              Plataforma de competencias empresariales en Bolivia. Impulsamos
              empresas con impacto social y ambiental a través de convocatorias,
              financiamiento y acompañamiento.
            </p>
          </div>

          {/* col 2: links rapidos */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">
              Navegacion
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-300 transition-colors hover:text-orange-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* col 3: plataforma */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">
              Plataforma
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-300 transition-colors hover:text-orange-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* col 4: contacto */}
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-wider text-white uppercase">
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-primary-300">
                <MapPin className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <span>La Paz, Bolivia</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-primary-300">
                <Mail className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <a
                  href="mailto:superimpact@ecv-impactobo.com"
                  className="transition-colors hover:text-orange-400"
                >
                  superimpact@ecv-impactobo.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* copyright */}
      <div className="border-t border-primary-700/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-primary-400">
            &copy; {new Date().getFullYear()} SUPERIMPACT360. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
