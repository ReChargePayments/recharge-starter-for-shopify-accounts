import { listSubscriptions } from '@rechargeapps/storefront-client';
import { useRechargeQuery } from './useRechargeQuery';

export function useSubscriptionsQuery() {
  return useRechargeQuery(
    async (session) => {
      return await listSubscriptions(session, {
        include: ['bundle_product']
      });
    },
    undefined,
    {
      select: (response) => response.subscriptions || [],
    }
  );
}
