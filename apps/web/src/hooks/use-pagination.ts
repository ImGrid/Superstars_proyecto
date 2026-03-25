"use client";

import { useQueryStates, parseAsInteger } from "nuqs";

const paginationParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

// hook para manejar paginacion sincronizada con la URL
export function usePagination(defaultLimit = 20) {
  const [pagination, setPagination] = useQueryStates(
    defaultLimit === 20
      ? paginationParsers
      : {
          page: parseAsInteger.withDefault(1),
          limit: parseAsInteger.withDefault(defaultLimit),
        },
    { history: "push" },
  );

  const setPage = (page: number) => setPagination({ page });
  const setLimit = (limit: number) => setPagination({ limit, page: 1 });
  const resetPage = () => setPagination({ page: 1 });

  return {
    page: pagination.page,
    limit: pagination.limit,
    setPage,
    setLimit,
    resetPage,
    // objeto listo para pasar como params a las funciones API
    paginationParams: { page: pagination.page, limit: pagination.limit },
  };
}
