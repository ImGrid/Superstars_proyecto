"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CloudUpload,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Icon } from "@iconify/react";
import {
  EstadoConvocatoria,
  type DocumentoResponse,
  type PropositoDocumento,
} from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  uploadDocumento,
  updateDocumento,
  downloadDocumento,
  deleteDocumento,
} from "@/lib/api/documento.api";
import { documentoQueries } from "@/lib/api/query-keys";
import { formatDate, formatFileSize } from "@/lib/format";

// propositos con etiquetas para el coordinador (no tecnicas)
const PROPOSITO_OPCIONES: {
  value: PropositoDocumento;
  label: string;
  descripcion: string;
}[] = [
  {
    value: "informativo",
    label: "Informativo (visible para todos)",
    descripcion:
      "El público y los postulantes lo pueden ver y descargar. Ej: bases, criterios.",
  },
  {
    value: "plantilla",
    label: "Plantilla para completar",
    descripcion:
      "El postulante lo descarga, lo llena y lo vuelve a subir. Ej: formato de presupuesto.",
  },
  {
    value: "jurado",
    label: "Solo jurado (privado)",
    descripcion:
      "Solo lo ven los evaluadores de la categoría. El público y los postulantes NO lo ven.",
  },
];

// badge corto para la lista
function PropositoBadge({ proposito }: { proposito: PropositoDocumento }) {
  const estilos: Record<PropositoDocumento, string> = {
    informativo: "border-emerald-300 text-emerald-700",
    plantilla: "border-blue-300 text-blue-700",
    jurado: "border-amber-300 text-amber-700",
  };
  const textos: Record<PropositoDocumento, string> = {
    informativo: "Todos",
    plantilla: "Plantilla",
    jurado: "Solo jurado",
  };
  return (
    <Badge variant="outline" className={estilos[proposito]}>
      {textos[proposito]}
    </Badge>
  );
}

interface DocumentosTabProps {
  convocatoriaId: number;
  categoriaId: number;
  estadoConvocatoria: string;
}

export function DocumentosTab({
  convocatoriaId,
  categoriaId,
  estadoConvocatoria,
}: DocumentosTabProps) {
  const queryClient = useQueryClient();
  const canEdit = estadoConvocatoria === EstadoConvocatoria.BORRADOR;

  // lista de documentos de la categoria
  const { data: documentos, isLoading } = useQuery(
    documentoQueries.list(convocatoriaId, categoriaId),
  );

  // estado del dialogo de upload
  const [uploadOpen, setUploadOpen] = useState(false);

  // estado para eliminar
  const [deleteTarget, setDeleteTarget] = useState<DocumentoResponse | null>(
    null,
  );

  // estado para editar (nombre + proposito)
  const [editTarget, setEditTarget] = useState<DocumentoResponse | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (docId: number) =>
      deleteDocumento(convocatoriaId, categoriaId, docId),
    onSuccess: () => {
      toast.success("Documento eliminado correctamente");
      queryClient.invalidateQueries({
        queryKey: documentoQueries.list(convocatoriaId, categoriaId).queryKey,
      });
      setDeleteTarget(null);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al eliminar el documento";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
      setDeleteTarget(null);
    },
  });

  // descarga de documento
  async function handleDownload(doc: DocumentoResponse) {
    try {
      const blob = await downloadDocumento(convocatoriaId, categoriaId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.nombreOriginal;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el documento");
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Documentos de la convocatoria</CardTitle>
          <CardDescription>
            Archivos adjuntos de la convocatoria (bases, reglamentos, anexos).
          </CardDescription>
        </div>
        {canEdit && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            Subir documento
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!documentos || documentos.length === 0 ? (
          <EmptyState
            icon="ph:file-text-duotone"
            title="Sin documentos"
            description="No se han subido documentos para esta convocatoria."
            action={
              canEdit ? (
                <Button
                  variant="outline"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="size-4" />
                  Subir documento
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Visible para</TableHead>
                <TableHead>Archivo original</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamano</TableHead>
                <TableHead>Subido</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentos.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.nombre}</TableCell>
                  <TableCell>
                    <PropositoBadge proposito={doc.proposito} />
                  </TableCell>
                  <TableCell className="text-secondary-500">
                    {doc.nombreOriginal}
                  </TableCell>
                  <TableCell className="text-sm text-secondary-500">
                    {doc.mimeType}
                  </TableCell>
                  <TableCell className="text-sm text-secondary-500">
                    {formatFileSize(doc.tamanoBytes)}
                  </TableCell>
                  <TableCell className="text-sm text-secondary-500">
                    {formatDate(doc.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDownload(doc)}>
                          <Download className="size-4" />
                          Descargar
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditTarget(doc)}>
                              <Pencil className="size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(doc)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* dialogo de upload */}
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          convocatoriaId={convocatoriaId}
          categoriaId={categoriaId}
          currentCount={documentos?.length ?? 0}
        />

        {/* dialogo de edicion (nombre + proposito) */}
        <EditDocumentoDialog
          documento={editTarget}
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          convocatoriaId={convocatoriaId}
          categoriaId={categoriaId}
        />

        {/* dialogo de confirmacion para eliminar */}
        {deleteTarget && (
          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title="Eliminar documento"
            description={`Se eliminara permanentemente el documento "${deleteTarget.nombre}". Esta accion no se puede deshacer.`}
            confirmLabel="Eliminar"
            onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
            isLoading={deleteMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

// dialogo para subir un documento con dropzone
function UploadDialog({
  open,
  onOpenChange,
  convocatoriaId,
  categoriaId,
  currentCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: number;
  categoriaId: number;
  currentCount: number;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [proposito, setProposito] = useState<PropositoDocumento>("informativo");

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file || !nombre.trim()) throw new Error("Datos incompletos");
      return uploadDocumento(
        convocatoriaId,
        categoriaId,
        file,
        nombre.trim(),
        currentCount + 1,
        proposito,
      );
    },
    onSuccess: () => {
      toast.success("Documento subido correctamente");
      queryClient.invalidateQueries({
        queryKey: documentoQueries.list(convocatoriaId, categoriaId).queryKey,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al subir el documento";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  function resetForm() {
    setNombre("");
    setFile(null);
    setIsDragging(false);
    setProposito("informativo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectFile(selected: File | null) {
    setFile(selected);
    if (selected && !nombre.trim()) {
      setNombre(selected.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    selectFile(e.target.files?.[0] ?? null);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files?.[0] ?? null;
      if (dropped) selectFile(dropped);
    },
    [nombre],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>
            Arrastra un archivo o haz click para seleccionarlo (max 20 MB).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* dropzone */}
          {!file ? (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary-500 bg-primary-50"
                  : "border-secondary-300 hover:border-primary-400 hover:bg-secondary-50"
              }`}
            >
              <CloudUpload
                className={`size-10 ${isDragging ? "text-primary-500" : "text-secondary-400"}`}
              />
              <p className="text-sm font-medium text-secondary-700">
                Arrastra para subir
              </p>
              <p className="text-xs text-secondary-500">
                Suelta tu archivo aqui o haz click para seleccionar
              </p>
              <p className="text-xs text-secondary-400">
                PDF, Word, Excel, PowerPoint o imagenes (max 20 MB)
              </p>
            </div>
          ) : (
            // archivo seleccionado
            <div className="flex items-center gap-3 rounded-lg border border-secondary-200 bg-secondary-50 p-3">
              <Icon icon="ph:file-text-duotone"className="size-8 shrink-0 text-primary-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary-900">
                  {file.name}
                </p>
                <p className="text-xs text-secondary-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          {/* input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />

          <div className="space-y-2">
            <Label htmlFor="doc-nombre">Nombre del documento</Label>
            <Input
              id="doc-nombre"
              placeholder="Ej: Bases de la convocatoria"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>¿Quién puede ver este documento?</Label>
            <Select
              value={proposito}
              onValueChange={(v) => setProposito(v as PropositoDocumento)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSITO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {PROPOSITO_OPCIONES.find((o) => o.value === proposito)?.descripcion}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            disabled={uploadMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!file || !nombre.trim() || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// dialogo para editar el nombre y el proposito de un documento existente
function EditDocumentoDialog({
  documento,
  open,
  onOpenChange,
  convocatoriaId,
  categoriaId,
}: {
  documento: DocumentoResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: number;
  categoriaId: number;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [proposito, setProposito] = useState<PropositoDocumento>("informativo");

  useEffect(() => {
    if (documento && open) {
      setNombre(documento.nombre);
      setProposito(documento.proposito);
    }
  }, [documento, open]);

  const mutation = useMutation({
    mutationFn: () =>
      updateDocumento(convocatoriaId, categoriaId, documento!.id, {
        nombre: nombre.trim(),
        proposito,
      }),
    onSuccess: () => {
      toast.success("Documento actualizado correctamente");
      queryClient.invalidateQueries({
        queryKey: documentoQueries.list(convocatoriaId, categoriaId).queryKey,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.message ?? "Error al actualizar el documento";
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>
            Cambia el nombre o quién puede ver este documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-doc-nombre">Nombre del documento</Label>
            <Input
              id="edit-doc-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>¿Quién puede ver este documento?</Label>
            <Select
              value={proposito}
              onValueChange={(v) => setProposito(v as PropositoDocumento)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPOSITO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {PROPOSITO_OPCIONES.find((o) => o.value === proposito)?.descripcion}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!nombre.trim() || mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
