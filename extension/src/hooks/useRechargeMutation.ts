import { useState, useCallback } from 'preact/hooks';

interface UseRechargeMutationOptions<TResponse> {
  onSuccess?: (data: TResponse) => void | Promise<void>;
  onError?: (error: Error) => void;
}

/**
 * Generic hook for mutations (POST/PUT/DELETE) with Recharge SDK functions
 * 
 * All mutation functions from rechargeSdk.ts get the session internally,
 * so this hook just wraps them with loading/error state management.
 */
export function useRechargeMutation<TParams, TResponse>(
  mutationFn: (params: TParams) => Promise<TResponse>,
  options: UseRechargeMutationOptions<TResponse> = {}
): {
  mutate: (params: TParams) => Promise<TResponse>;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { onSuccess, onError } = options;

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (params: TParams): Promise<TResponse> => {
      setIsPending(true);
      setError(null);

      try {
        const response = await mutationFn(params);

        if (onSuccess) {
          await onSuccess(response);
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (onError) {
          onError(error);
        }

        // Re-throw so callers can use try/catch if needed
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsPending(false);
  }, []);

  return { mutate, isPending, error, reset };
}
