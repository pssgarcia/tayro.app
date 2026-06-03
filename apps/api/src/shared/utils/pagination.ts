export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginate(params: PaginationParams): { skip: number; take: number } {
  const page = Math.max(1, params.page);
  const limit = Math.min(100, Math.max(1, params.limit));
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const limit = Math.min(100, Math.max(1, params.limit));
  return {
    data,
    meta: {
      total,
      page: params.page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
