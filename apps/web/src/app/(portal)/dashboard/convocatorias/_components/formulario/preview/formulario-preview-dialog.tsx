"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@iconify/react";
import type { SchemaDefinition } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PreviewWizard } from "./preview-wizard";
import { sanitizarSchemaPreview } from "./sanitizar-schema-preview";

interface FormularioPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: SchemaDefinition;
  // hay cambios en el editor que todavia no se guardaron
  isDirty: boolean;
  // texto del boton de cierre. El builder del admin viene de un editor ("Volver
  // al editor"); otros contextos (ej. el portal de seguimiento) solo consultan,
  // asi que pueden pasar "Volver".
  textoCerrar?: string;
}

// Ventana que muestra el formulario tal como lo vera el proponente. El wizard se
// monta solo cuando el dialogo esta abierto, asi cada apertura arranca en blanco y
// nada de lo que se escriba aqui sobrevive al cierre.
export function FormularioPreviewDialog({
  open,
  onOpenChange,
  schema,
  isDirty,
  textoCerrar = "Volver al editor",
}: FormularioPreviewDialogProps) {
  const schemaLimpio = useMemo(() => sanitizarSchemaPreview(schema), [schema]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ocupa toda la pantalla: se entra a la vista del proponente en vez de mirarla
          por una ventanita. Hay que pisar el centrado y el ancho que trae DialogContent
          (top/left 50% + translate + sm:max-w-lg) */}
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-screen max-h-screen w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-w-none"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between gap-4 border-b border-secondary-200 px-6 py-4">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <Icon icon="ph:eye-duotone" className="size-5 text-primary-600" />
              Así lo verá el proponente
            </DialogTitle>
            <DialogDescription>
              Puedes escribir y recorrer los pasos para probarlo. Nada de lo que
              hagas aquí se guarda ni se envía.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="size-4" />
            {textoCerrar}
          </Button>
        </DialogHeader>

        {/* avisos: por que lo que se ve puede no coincidir del todo con lo guardado */}
        <div className="shrink-0 space-y-2 border-b border-secondary-100 bg-secondary-50/60 px-6 py-3">
          {isDirty && (
            <p className="flex items-start gap-2 text-xs text-warning-800">
              <Icon
                icon="ph:warning-duotone"
                className="mt-0.5 size-4 shrink-0 text-warning-600"
              />
              Estás viendo tus cambios sin guardar. Para que el proponente los vea,
              guarda el formulario.
            </p>
          )}
          <p className="flex items-start gap-2 text-xs text-secondary-500">
            <Icon
              icon="ph:info-duotone"
              className="mt-0.5 size-4 shrink-0 text-info-600"
            />
            Aquí los campos salen vacíos. Al proponente, los que tienen
            autorrelleno le llegarán ya cargados con los datos de su empresa.
          </p>
        </div>

        {/* el formulario, con su propio scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-secondary-50/30 px-6 py-6">
          {open && <PreviewWizard schema={schemaLimpio} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
