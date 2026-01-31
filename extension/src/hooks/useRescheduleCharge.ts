import { useRechargeMutation } from './useRechargeMutation';
import { rescheduleChargeDate } from '../utils/rechargeSdk';

interface RescheduleChargeParams {
  chargeId: number | string;
  newDateIso: string;
}

export function useRescheduleCharge(options?: {
  onSuccess?: (data: Awaited<ReturnType<typeof rescheduleChargeDate>>) => void | Promise<void>;
  onError?: (error: Error) => void;
}) {
  return useRechargeMutation<RescheduleChargeParams, Awaited<ReturnType<typeof rescheduleChargeDate>>>(
    async (params) => {
      return await rescheduleChargeDate(params.chargeId, params.newDateIso);
    },
    options
  );
}
