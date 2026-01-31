import { useRechargeMutation } from './useRechargeMutation';
import { changeQuantity, type SubscriptionUpdateOptions } from '../utils/rechargeSdk';

interface ChangeQuantityParams {
  subscriptionId: number | string;
  newQuantity: number;
  options?: SubscriptionUpdateOptions;
}

export function useChangeQuantity(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof changeQuantity>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<ChangeQuantityParams, Awaited<ReturnType<typeof changeQuantity>>>(
    async (params) => {
      return await changeQuantity(params.subscriptionId, params.newQuantity, params.options);
    },
    options
  );
}
