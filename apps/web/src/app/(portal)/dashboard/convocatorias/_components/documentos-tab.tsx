"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CloudUpload,
  Download,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { EstadoConvocatoria, type DocumentoResponse } from "@superstars/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  downloadDocumento,
  deleteDocumento,
} from "@/lib/api/documento.api";
import { documentoQueries } from "@/lib/api/query-keys";
import { formatDate, formatFileSize } from "@/lib/format";

interface DocumentosTabProps {
  convocatoriaId: number;
  estadoConvocatoria: string;
}

export function DocumentosTab({
  convocatoriaId,
  estadoConvocatoria,
}: DocumentosTabProps) {
  const queryClient = useQueryClient();
  const canEdit = estadoConvocatoria === EstadoConvocatoria.BORRADOR;

  // lista de documentos
  const { data: documentos, isLoading } = useQuery(
    documentoQueries.list(convocatoriaId),
  );

  // estado del dialogo de upload
  const [uploadOpen, setUploadOpen] = useState(false);

  // estado para eliminar
  const [deleteTarget, setDeleteTarget] = useState<DocumentoResponse | null>(
    null,
  );

  const deleteMutation = useMutation({
    mutationFn: (docId: number) => deleteDocumento(convocatoriaId, docId),
    onSuccess: () => {
      toast.success("Documento eliminado correctamente");
      queryClient.invalidateQueries({
        queryKey: documentoQueries.list(convocatoriaId).queryKey,
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
      const blob = await downloadDocumento(convocatoriaId, doc.id);
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
          currentCount={documentos?.length ?? 0}
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
  currentCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: number;
  currentCount: number;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file || !nombre.trim()) throw new Error("Datos incompletos");
      return uploadDocumento(convocatoriaId, file, nombre.trim(), currentCount + 1);
    },
    onSuccess: () => {
      toast.success("Documento subido correctamente");
      queryClient.invalidateQueries({
        queryKey: documentoQueries.list(convocatoriaId).queryKey,
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
