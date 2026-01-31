import { useRechargeMutation } from './useRechargeMutation';
import { skipChargeById } from '../utils/rechargeSdk';

interface SkipChargeParams {
  chargeId: number | string;
  subscriptionIds: (number | string)[];
}

export function useSkipCharge(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof skipChargeById>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<SkipChargeParams, Awaited<ReturnType<typeof skipChargeById>>>(
    async (params) => {
      return await skipChargeById(params.chargeId, params.subscriptionIds);
    },
    options
  );
}
