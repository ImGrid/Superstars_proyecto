"use client";

import { memo, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FieldRendererProps } from "./field-props";

// tipo para una fila de la tabla
type RowData = Record<string, string | number | undefined>;

export const TablaField = memo(function TablaField({
  campo,
  form,
}: FieldRendererProps) {
  if (campo.tipo !== "tabla") return null;

  const { columnas, filasIniciales, filasDinamicas, filasFijas } = campo;

  // crear una fila vacia basada en las columnas
  // celdas numericas se inicializan como undefined (no "") para evitar
  // rechazo del validador Zod en draft save (z.number no acepta string vacio)
  const createEmptyRow = useCallback(
    (fixedLabel?: string): RowData => {
      const row: RowData = {};
      for (const col of columnas) {
        if (fixedLabel && col === columnas[0]) {
          row[col.id] = fixedLabel;
        } else if (col.tipo === "numerico") {
          row[col.id] = undefined;
        } else {
          row[col.id] = "";
        }
      }
      return row;
    },
    [columnas],
  );

  return (
    <FormField
      control={form.control}
      name={campo.id}
      render={({ field }) => {
        // inicializar filas si no hay datos
        let rows = (field.value as RowData[]) ?? [];
        if (rows.length === 0) {
          if (filasFijas && filasFijas.length > 0) {
            rows = filasFijas.map((f) => createEmptyRow(f.label));
          } else {
            rows = Array.from({ length: filasIniciales ?? 3 }, () =>
              createEmptyRow(),
            );
          }
          // setear las filas iniciales sin disparar re-render del padre
          setTimeout(() => field.onChange(rows), 0);
        }

        const updateCell = (
          rowIndex: number,
          colId: string,
          value: string,
          colType: string,
        ) => {
          const updated = [...rows];
          // celdas numericas vacias se almacenan como undefined,
          // no como string "" (no es Number ni undefined → falla Zod)
          let cellValue: string | number | undefined;
          if (colType === "numerico") {
            cellValue = value === "" ? undefined : Number(value);
          } else {
            cellValue = value;
          }
          updated[rowIndex] = {
            ...updated[rowIndex],
            [colId]: cellValue,
          };
          field.onChange(updated);
        };

        const addRow = () => {
          field.onChange([...rows, createEmptyRow()]);
        };

        const removeRow = (index: number) => {
          if (rows.length <= 1) return;
          field.onChange(rows.filter((_, i) => i !== index));
        };

        return (
          <FormItem>
            <FormLabel>
              {campo.etiqueta}
              {campo.requerido && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            {campo.descripcion && (
              <FormDescription>{campo.descripcion}</FormDescription>
            )}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columnas.map((col) => (
                      <TableHead key={col.id}>
                        {col.titulo}
                        {col.requerido && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </TableHead>
                    ))}
                    {filasDinamicas && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      {columnas.map((col) => (
                        <TableCell key={col.id} className="p-2">
                          <Input
                            type={col.tipo === "numerico" ? "number" : "text"}
                            value={row[col.id] ?? ""}
                            onChange={(e) =>
                              updateCell(rowIdx, col.id, e.target.value, col.tipo)
                            }
                            className="h-8 text-sm"
                          />
                        </TableCell>
                      ))}
                      {filasDinamicas && (
                        <TableCell className="p-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeRow(rowIdx)}
                            disabled={rows.length <= 1}
                          >
                            <Trash2 className="size-3.5 text-red-500" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {filasDinamicas && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1"
                onClick={addRow}
              >
                <Plus className="size-3.5" />
                Agregar fila
              </Button>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
});
