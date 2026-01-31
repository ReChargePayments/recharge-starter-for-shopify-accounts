import { useRechargeMutation } from './useRechargeMutation';
import { cancelItem, type SubscriptionUpdateOptions } from '../utils/rechargeSdk';

interface CancelSubscriptionParams {
  subscriptionId: number | string;
  input: {
    reason: string;
    comments?: string;
    sendEmail?: boolean;
  };
  options?: SubscriptionUpdateOptions;
}

export function useCancelSubscription(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof cancelItem>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<CancelSubscriptionParams, Awaited<ReturnType<typeof cancelItem>>>(
    async (params) => {
      return await cancelItem(params.subscriptionId, params.input, params.options);
    },
    options
  );
}
