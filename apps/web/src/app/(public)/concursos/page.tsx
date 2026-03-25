"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Trophy } from "lucide-react";
import { publicQueries } from "@/lib/api/query-keys";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { ConcursoCard } from "./_components/concurso-card";
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

export default function ConcursosPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery(
    publicQueries.concursos({ page, limit: ITEMS_PER_PAGE, search: search || undefined }),
  );

  // al buscar, volver a pagina 1
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      {/* header */}
      <section className="bg-primary-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Concursos
          </h1>
          <p className="mt-3 text-lg text-primary-200">
            Explora las convocatorias abiertas y encuentra la oportunidad ideal
            para tu empresa.
          </p>
        </div>
      </section>

      {/* contenido */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* barra de busqueda */}
          <div className="relative mb-8 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary-400" />
            <Input
              placeholder="Buscar concurso..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* cargando */}
          {isLoading && <CardSkeleton count={6} />}

          {/* sin resultados */}
          {!isLoading && (!data || data.data.length === 0) && (
            <EmptyState
              icon={Trophy}
              title="No hay concursos disponibles"
              description={
                search
                  ? "No se encontraron concursos con ese criterio de busqueda."
                  : "Aun no se han publicado concursos. Vuelve pronto para ver las convocatorias."
              }
            />
          )}

          {/* grid de cards */}
          {!isLoading && data && data.data.length > 0 && (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.data.map((concurso) => (
                  <ConcursoCard key={concurso.id} concurso={concurso} />
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

// paginacion con numeros, ellipsis y anterior/siguiente
function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) pages.push("ellipsis");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("ellipsis");

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
