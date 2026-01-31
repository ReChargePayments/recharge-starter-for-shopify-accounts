import { listCharges, Charge } from '@rechargeapps/storefront-client';
import { useRechargeQuery } from './useRechargeQuery';

type ChargeErrorData = {
  id: Charge['id'];
  errorType: Charge['error_type'];
  scheduledAt: Charge['scheduled_at'];
};

export const useChargeError = () => {
  const { data, isInitialLoading } = useRechargeQuery(
    async (session) => {
      return await listCharges(session, {
        status: ['error'],
        sort_by: 'scheduled_at-asc',
        limit: 1,
      });
    },
    undefined,
    {
      select: (response): ChargeErrorData => {
        if (!response.charges.length) {
          return undefined;
        }

        const charge = response.charges[0];
        return {
          id: charge.id,
          errorType: charge.error_type,
          scheduledAt: charge.scheduled_at,
        }
      },
    }
  );

  return {
    data: data ?? undefined,
    isInitialLoading,
  };
};
