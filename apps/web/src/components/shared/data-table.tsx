"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// definicion de columna tipada
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  // nombre (plural) de los items, para mostrar el total: "9 empresas"
  itemName?: string;
  // si se provee, muestra el selector de filas por pagina (10/20/50)
  onLimitChange?: (limit: number) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

// opciones del selector de filas por pagina
const PAGE_SIZES = [10, 20, 50];

// genera el rango de paginas visibles alrededor de la pagina actual
function getPageRange(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < totalPages - 2) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  limit,
  onPageChange,
  itemName,
  onLimitChange,
  isLoading = false,
  emptyState,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / limit) || 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // linea compacta con el total (se usa arriba y abajo de la tabla)
  const totalLine = itemName ? (
    <p className="text-sm text-secondary-500">
      <span className="font-medium tabular-nums text-secondary-900">{total}</span>{" "}
      {itemName}
    </p>
  ) : null;

  // selector de filas por pagina (compacto)
  const pageSizeSelector = onLimitChange ? (
    <div className="flex items-center gap-2 text-sm text-secondary-500">
      <span className="hidden sm:inline">Filas:</span>
      <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
        <SelectTrigger className="h-8 w-[4.25rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  // skeleton de carga
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: limit > 10 ? 10 : limit }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // estado vacio
  if (data.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        </Table>
        {emptyState}
      </div>
    );
  }

  const pageRange = getPageRange(page, totalPages);

  return (
    <div className="space-y-3">
      {/* total arriba (compacto, siempre visible) */}
      {totalLine}

      {/* tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* pie: total (rango si hay paginacion) + selector de filas + paginacion */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {totalPages > 1 ? (
          <p className="text-sm text-secondary-500">
            Mostrando{" "}
            <span className="tabular-nums">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </span>{" "}
            de{" "}
            <span className="font-medium tabular-nums text-secondary-900">{total}</span>
            {itemName ? ` ${itemName}` : ""}
          </p>
        ) : (
          totalLine
        )}

        <div className="flex items-center gap-4">
          {pageSizeSelector}

          {totalPages > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => hasPrev && onPageChange(page - 1)}
                    className={
                      hasPrev ? "cursor-pointer" : "pointer-events-none opacity-50"
                    }
                  />
                </PaginationItem>

                {pageRange.map((p, i) =>
                  p === "ellipsis" ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => onPageChange(p)}
                        className="cursor-pointer"
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => hasNext && onPageChange(page + 1)}
                    className={
                      hasNext ? "cursor-pointer" : "pointer-events-none opacity-50"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  );
}
