import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { BrandDashboard } from '../types/api';

export const dashboardKeys = {
  brand: ['dashboard', 'brand'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.brand,
    queryFn: () => api.get<BrandDashboard>('/brand/dashboard').then((r) => r.data),
  });
}
