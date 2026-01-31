import { useRechargeMutation } from './useRechargeMutation';
import { rescheduleSubscription } from '../utils/rechargeSdk';

interface RescheduleSubscriptionParams {
  subscriptionId: number | string;
  newDateIso: string;
  options?: { commit?: boolean };
}

export function useRescheduleSubscription(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof rescheduleSubscription>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<RescheduleSubscriptionParams, Awaited<ReturnType<typeof rescheduleSubscription>>>(
    async (params) => {
      return await rescheduleSubscription(params.subscriptionId, params.newDateIso, params.options);
    },
    options
  );
}
