import { useRechargeMutation } from './useRechargeMutation';
import { changeFrequency, type SubscriptionUpdateOptions } from '../utils/rechargeSdk';
import type { IntervalUnit } from '@rechargeapps/storefront-client';

interface ChangeFrequencyParams {
  subscriptionId: number | string;
  input: {
    orderIntervalFrequency: number;
    orderIntervalUnit: IntervalUnit;
    chargeIntervalFrequency?: number;
  };
  options?: SubscriptionUpdateOptions;
}

export function useChangeFrequency(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof changeFrequency>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<ChangeFrequencyParams, Awaited<ReturnType<typeof changeFrequency>>>(
    async (params) => {
      return await changeFrequency(params.subscriptionId, params.input, params.options);
    },
    options
  );
}
