import { useRechargeMutation } from './useRechargeMutation';
import { skipItem } from '../utils/rechargeSdk';

interface SkipItemParams {
  subscriptionId: number | string;
  date: string;
}

export function useSkipItem(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof skipItem>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<SkipItemParams, Awaited<ReturnType<typeof skipItem>>>(
    async (params) => {
      return await skipItem(params.subscriptionId, params.date);
    },
    options
  );
}
