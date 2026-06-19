import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Campaign, Paginated } from '../types/api';

export const browseProgramsKeys = {
  list: (page: number) => ['programs', 'browse', page] as const,
};

// Lista programas ACTIVE (público, paginado) — GET /campaigns
export function useBrowsePrograms(page: number, limit = 12) {
  return useQuery({
    queryKey: browseProgramsKeys.list(page),
    queryFn: () =>
      api
        .get<Paginated<Campaign>>('/campaigns', { params: { page, limit } })
        .then((r) => r.data),
    // mantém os dados da página anterior visíveis enquanto a próxima carrega
    placeholderData: keepPreviousData,
  });
}
