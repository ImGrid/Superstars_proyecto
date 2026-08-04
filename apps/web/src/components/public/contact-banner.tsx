import Link from "next/link";
import { Mail, MailQuestion } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contacto";

// Banner de contacto del material del cliente (Contactanos-HD.png). Reemplaza al
// antiguo CTA. El naranja es un capricho del cliente: esta hardcodeado SOLO aqui,
// no pertenece a la paleta oficial y no debe usarse en ningun otro lugar.
const NARANJA = "#FE5901";
const PEACH = "#FEE8DB";

type ContactBannerProps = {
  className?: string;
};

export function ContactBanner({ className = "" }: ContactBannerProps) {
  return (
    <section className={`py-8 lg:py-10 ${className}`}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border-2 bg-white px-5 py-5 text-center sm:px-7 md:flex-row md:gap-6 md:text-left"
          style={{ borderColor: NARANJA }}
        >
          {/* icono: sobre con signo de interrogacion sobre circulo peach */}
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: PEACH }}
          >
            <MailQuestion className="size-7" style={{ color: NARANJA }} />
          </div>

          {/* divisoria vertical (solo escritorio) */}
          <span
            className="hidden h-14 w-0.5 shrink-0 rounded md:block"
            style={{ backgroundColor: `${NARANJA}33` }}
          />

          {/* texto */}
          <div className="flex-1">
            <p className="font-display text-lg leading-tight font-bold text-primary-600 sm:text-xl">
              ¿Tienes problemas, dudas o preguntas?
            </p>
            <p className="mt-1 text-sm font-semibold text-primary-600 sm:text-base">
              Escríbenos, estaremos encantados de ayudarte.
            </p>
          </div>

          {/* contacto por correo */}
          <div className="w-full shrink-0 sm:w-auto">
            <Link
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center justify-center gap-2.5 rounded-xl px-4 py-3 font-display text-xs font-bold text-white transition-opacity hover:opacity-90 sm:text-base"
              style={{ backgroundColor: NARANJA }}
            >
              <Mail className="size-5 shrink-0" />
              <span className="whitespace-nowrap">{CONTACT_EMAIL}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
