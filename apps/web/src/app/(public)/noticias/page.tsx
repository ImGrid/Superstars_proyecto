"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/api/query-keys";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PublicacionCard } from "./_components/publicacion-card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

export default function NoticiasPage() {
  const [page, setPage] = useState(1);
  const [categoriaId, setCategoriaId] = useState<number | undefined>(undefined);

  const { data: categoriasData } = useQuery(publicQueries.categorias());

  const { data, isLoading } = useQuery(
    publicQueries.publicaciones({ page, limit: ITEMS_PER_PAGE, categoriaId }),
  );

  // al cambiar categoria, volver a pagina 1
  const handleCategoriaChange = (catId: number | undefined) => {
    setCategoriaId(catId);
    setPage(1);
  };

  return (
    <>
      {/* header */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Noticias y publicaciones
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Mantente informado sobre nuestras convocatorias, resultados y
            novedades.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* filtro por categorias */}
          {categoriasData && categoriasData.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <button
                onClick={() => handleCategoriaChange(undefined)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  categoriaId === undefined
                    ? "bg-primary-700 text-white"
                    : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200",
                )}
              >
                Todas
              </button>
              {categoriasData.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoriaChange(cat.id)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    categoriaId === cat.id
                      ? "bg-primary-700 text-white"
                      : "bg-secondary-100 text-secondary-600 hover:bg-secondary-200",
                  )}
                >
                  {cat.nombre}
                </button>
              ))}
            </div>
          )}

          {/* estados de carga y vacio */}
          {isLoading && <CardSkeleton count={6} />}

          {!isLoading && (!data || data.data.length === 0) && (
            <EmptyState
              icon="ph:newspaper-duotone"
              title="No hay publicaciones disponibles"
              description="Aún no se han publicado noticias. Vuelve pronto para ver las novedades."
            />
          )}

          {/* grid de cards */}
          {!isLoading && data && data.data.length > 0 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map((pub) => (
                  <PublicacionCard key={pub.id} publicacion={pub} />
                ))}
              </div>

              {/* paginacion */}
              {data.totalPages > 1 && (
                <div className="mt-10">
                  <PaginationBar
                    currentPage={data.page}
                    totalPages={data.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

// paginacion local con numeros, ellipsis y anterior/siguiente
function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  // genera array de paginas visibles con ellipsis
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // siempre primera pagina
    pages.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");

    // siempre ultima pagina
    pages.push(totalPages);
    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className={cn(
              "cursor-pointer",
              currentPage === 1 && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>

        {getPageNumbers().map((pageNum, idx) =>
          pageNum === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pageNum}>
              <PaginationLink
                isActive={pageNum === currentPage}
                onClick={() => onPageChange(pageNum)}
                className="cursor-pointer"
              >
                {pageNum}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            className={cn(
              "cursor-pointer",
              currentPage === totalPages && "pointer-events-none opacity-50",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
