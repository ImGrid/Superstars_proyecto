import Image from "next/image";
import Link from "next/link";
import { Download } from "lucide-react";

// Tarjetas de documentos del material del cliente (Doc1-HD .. Doc6-HD). Cada una
// tiene su color de acento, hardcodeado a proposito: son los tonos exactos del
// material (no de la paleta oficial). Los botones NO descargan: redirigen a
// registro para incentivar la creacion de cuenta.
const DOCUMENTOS = [
  {
    numero: 1,
    icono: "/images/doc-1-icono.png",
    titulo: "Documento\nde bases",
    descripcion:
      "Consulta las bases del concurso y conoce todas las condiciones para participar.",
    acento: "#016AE5",
    borde: "#BBD6F7",
  },
  {
    numero: 2,
    icono: "/images/doc-2-icono.png",
    titulo: "Criterios de elegibilidad",
    descripcion:
      "Revisa los requisitos que deben cumplir los participantes para ser elegibles.",
    acento: "#18761B",
    borde: "#C1E0C2",
  },
  {
    numero: 3,
    icono: "/images/doc-3-icono.png",
    titulo: "Criterios de evaluación",
    descripcion:
      "Conoce los aspectos que serán evaluados y cómo se seleccionarán las propuestas ganadoras.",
    acento: "#3E1887",
    borde: "#CDBBE7",
  },
  {
    numero: 4,
    icono: "/images/doc-4-icono.png",
    titulo: "Formulario de propuesta",
    descripcion:
      "Descarga el formulario oficial para presentar tu propuesta.",
    acento: "#E85601",
    borde: "#F8CDB0",
  },
  {
    numero: 5,
    icono: "/images/doc-5-icono.png",
    titulo: "Formulario de presupuesto",
    descripcion:
      "Descarga el formato oficial para elaborar el presupuesto de tu propuesta.",
    acento: "#B9131F",
    borde: "#EDBCC0",
  },
  {
    numero: 6,
    icono: "/images/doc-6-icono.png",
    titulo: "Preguntas frecuentes",
    descripcion:
      "Aclara tus dudas sobre el proceso de postulación, requisitos y más.",
    acento: "#058793",
    borde: "#B4DBDF",
  },
];

type Documento = (typeof DOCUMENTOS)[number];

function DocumentoCard({ doc }: { doc: Documento }) {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border-2 bg-white px-3 pt-5 pb-5 text-center shadow-sm"
      style={{ borderColor: doc.borde }}
    >
      {/* icono (el circulo tintado viene incluido en el PNG) */}
      <Image
        src={doc.icono}
        alt=""
        width={100}
        height={100}
        className="size-16"
      />

      {/* numero */}
      <p
        className="mt-1 font-display text-2xl font-bold"
        style={{ color: doc.acento }}
      >
        {doc.numero}.
      </p>

      {/* titulo: min-height reserva 2 lineas (todos los titulos ocupan 2) para
          alinear las divisorias sin dejar hueco. whitespace-pre-line respeta el
          salto manual del titulo 1 (Documento / de bases) */}
      <h3 className="mt-1 min-h-[2.5rem] font-display text-sm leading-tight font-bold whitespace-pre-line text-primary-600 uppercase">
        {doc.titulo}
      </h3>

      {/* divisoria corta */}
      <span
        className="my-3 h-1 w-10 rounded-full"
        style={{ backgroundColor: doc.acento }}
      />

      {/* descripcion: min-height reserva las lineas para alinear las filas; mb
          garantiza aire antes del boton aunque el texto ocupe 4 lineas */}
      <p className="mb-5 min-h-[5rem] text-xs leading-relaxed font-semibold text-primary-600">
        {doc.descripcion}
      </p>

      {/* boton: redirige a registro (no descarga), mt-auto lo fija al fondo */}
      <Link
        href="/auth/registro"
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 font-display text-sm font-bold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: doc.acento }}
      >
        <Download className="size-4" />
        Descargar
      </Link>
    </div>
  );
}

// Seccion de documentos del concurso, replica del material del cliente. Va debajo
// de "Como funciona". Los botones incentivan la creacion de cuenta.
export function DocumentosSection() {
  return (
    <section id="documentos" className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-display text-3xl leading-[1.3] tracking-wide text-primary-600 uppercase sm:text-4xl">
          Documentos de postulación
        </h2>
        <div className="mx-auto mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {DOCUMENTOS.map((doc) => (
            <DocumentoCard key={doc.numero} doc={doc} />
          ))}
        </div>
      </div>
    </section>
  );
}
