"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Icon } from "@iconify/react";
import type { SeguimientoDocumento } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";
import { downloadSeguimientoDocumento } from "@/lib/api/seguimiento.api";

interface Props {
  convocatoriaId: number;
  categoriaId: number;
  doc: SeguimientoDocumento;
}

// Fila de documento descargable del portal de seguimiento.
//
// Mismo patron que la del proponente (blob -> enlace temporal -> click), pero
// pega al endpoint del observador. El backend ya excluye los documentos de
// proposito jurado, asi que aca nunca llega uno.
export function DocumentoDescargable({ convocatoriaId, categoriaId, doc }: Props) {
  const [descargando, setDescargando] = useState(false);
  const extension = doc.nombreOriginal.split(".").pop()?.toUpperCase() ?? "Archivo";

  async function handleDownload() {
    setDescargando(true);
    try {
      const blob = await downloadSeguimientoDocumento(convocatoriaId, categoriaId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombreOriginal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // el toast global maneja el error
    } finally {
      setDescargando(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-secondary-200 p-2.5">
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-azul-50">
        <Icon icon="ph:file-text-duotone" className="size-5 text-azul-700" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="line-clamp-2 text-sm font-medium break-words text-secondary-900"
          title={doc.nombre}
        >
          {doc.nombre}
        </p>
        <p className="text-xs text-secondary-600">
          {extension} · {formatFileSize(doc.tamanoBytes)}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="min-h-11 shrink-0"
        onClick={handleDownload}
        disabled={descargando}
      >
        {descargando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Descargar
      </Button>
    </div>
  );
}
