import { useRechargeMutation } from './useRechargeMutation';
import { addActiveSubscriptionToUpcomingOrder } from '../utils/rechargeSdk';

interface AddActiveSubscriptionToUpcomingOrderParams {
  subscriptionId: number | string;
  upcomingDateIso: string;
  options?: { commit?: boolean };
}

export function useAddActiveSubscriptionToUpcomingOrder(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof addActiveSubscriptionToUpcomingOrder>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<AddActiveSubscriptionToUpcomingOrderParams, Awaited<ReturnType<typeof addActiveSubscriptionToUpcomingOrder>>>(
    async (params) => {
      return await addActiveSubscriptionToUpcomingOrder(params.subscriptionId, params.upcomingDateIso, params.options);
    },
    options
  );
}
