import { useRechargeMutation } from './useRechargeMutation';
import { swapSubscriptionVariant, type SubscriptionUpdateOptions } from '../utils/rechargeSdk';

interface SwapSubscriptionVariantParams {
  subscriptionId: number | string;
  newExternalVariantId: string;
  options?: SubscriptionUpdateOptions;
}

export function useSwapSubscriptionVariant(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof swapSubscriptionVariant>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<SwapSubscriptionVariantParams, Awaited<ReturnType<typeof swapSubscriptionVariant>>>(
    async (params) => {
      return await swapSubscriptionVariant(params.subscriptionId, params.newExternalVariantId, params.options);
    },
    options
  );
}
