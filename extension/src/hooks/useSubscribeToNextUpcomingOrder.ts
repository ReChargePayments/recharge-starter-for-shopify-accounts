import { useRechargeMutation } from './useRechargeMutation';
import { subscribeToNextUpcomingOrder } from '../utils/rechargeSdk';

interface SubscribeToNextUpcomingOrderParams {
  subscriptionId: number | string;
  nextChargeDateIso: string;
}

export function useSubscribeToNextUpcomingOrder(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof subscribeToNextUpcomingOrder>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<SubscribeToNextUpcomingOrderParams, Awaited<ReturnType<typeof subscribeToNextUpcomingOrder>>>(
    async (params) => {
      return await subscribeToNextUpcomingOrder(params.subscriptionId, params.nextChargeDateIso);
    },
    options
  );
}
