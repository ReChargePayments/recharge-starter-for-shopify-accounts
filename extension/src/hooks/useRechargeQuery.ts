import { useEffect, useState, useMemo, useRef } from 'preact/hooks';
import { Session } from '@rechargeapps/storefront-client';
import { useRechargeSession } from '../contexts/RechargeSessionContext';
import { useRecharge } from './useRecharge';

interface UseRechargeQueryOptions<TResponse, TData> {
  enabled?: boolean;
  select?: (response: TResponse) => TData;
  deps?: unknown[];
}

/**
 * Generic hook for fetching data from Recharge SDK functions
 * 
 * @param queryFn - Function that takes session and params, returns Promise<TResponse>
 * @param params - Parameters to pass to the query function
 * @param options - Optional configuration
 * @returns Object with data, isInitialLoading, isFetching, error, and refetch function
 */
export function useRechargeQuery<TResponse, TData = TResponse, TParams = unknown>(
  queryFn: (session: Session, params?: TParams) => Promise<TResponse>,
  params?: TParams,
  options: UseRechargeQueryOptions<TResponse, TData> = {}
): {
  data: TData | null;
  isInitialLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<{ data: TData; error: Error | null }>;
} {
  const { enabled = true, select, deps } = options;
  const { isLoading: isRechargeLoading } = useRecharge();
  const { getSession } = useRechargeSession();

  const [data, setData] = useState<TData | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create stable dependency key from paramaters using JSON.stringify.
  const paramsKey = useMemo(() => {
    if (params === undefined || params === null) {
      return null;
    }
    if (typeof params === 'object' && !Array.isArray(params)) {
      return JSON.stringify(params, Object.keys(params as Record<string, unknown>).sort());
    }
    return JSON.stringify(params);
  }, [params]);

  // Memoize dependency array generation
  const dependencyArray = useMemo(() => {
    if (deps !== undefined) {
      return [enabled, isRechargeLoading, ...deps];
    }
    return [enabled, isRechargeLoading, paramsKey];
  }, [enabled, isRechargeLoading, deps, paramsKey]);

  // Shared execute function - accepts AbortSignal for cancellation
  const execute = async (signal: AbortSignal): Promise<{ data: TData; error: Error | null }> => {
    setIsFetching(true);
    setError(null);

    try {
      const session = await getSession();

      if (signal.aborted) {
        throw new Error('Query was cancelled');
      }

      const response = await queryFn(session, params);

      if (signal.aborted) {
        throw new Error('Query was cancelled');
      }

      const result = select ? select(response) : (response as unknown as TData);

      if (signal.aborted) {
        throw new Error('Query was cancelled');
      }

      setData(result);
      setError(null);
      return { data: result, error: null };
    } catch (err) {
      if (signal.aborted) {
        return { data: null as TData, error: null };
      }
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return { data: null as TData, error };
    } finally {
      if (!signal.aborted) {
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      setIsInitialLoading(false);
      return;
    }
    if (isRechargeLoading) return;

    setIsInitialLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    execute(abortController.signal).then(() => {
      setIsInitialLoading(false);
    })

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, dependencyArray);

  const refetch = async (): Promise<{ data: TData; error: Error | null }> => {
    // Stop any inflight requests before doing a new one.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const result = await execute(abortController.signal);
    setIsInitialLoading(false);
    return result;
  };

  return { data, isInitialLoading, isFetching, error, refetch };
}
