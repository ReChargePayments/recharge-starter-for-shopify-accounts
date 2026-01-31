import { useMemo } from 'preact/hooks';
import { listCharges } from '@rechargeapps/storefront-client';
import { useRechargeQuery } from './useRechargeQuery';

interface UseChargesQueryParams {
  status?: string[];
  scheduled_at_min?: string;
  limit?: number;
  include?: string[];
  sort_by?: string;
}

/**
 * Fetch charges
 */
export function useChargesQuery(params: UseChargesQueryParams = {}) {
  const normalizedParams = useMemo(() => ({
    ...params,
    include: params.include || [],
  }), [params.status?.join(','), params.scheduled_at_min, params.limit, params.include?.join(','), params.sort_by]);

  const deps = useMemo(() => [
    params.status?.join(','),
    params.scheduled_at_min,
    params.limit,
    params.include?.join(','),
    params.sort_by,
  ], [params.status, params.scheduled_at_min, params.limit, params.include, params.sort_by]);

  return useRechargeQuery(
    async (session, queryParams) => {
      return await listCharges(session, queryParams as any);
    },
    normalizedParams,
    {
      select: (response) => response.charges || [],
      deps,
    }
  );
}
