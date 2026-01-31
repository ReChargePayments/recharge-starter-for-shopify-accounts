import { getCustomer } from '@rechargeapps/storefront-client';
import { useRechargeQuery } from './useRechargeQuery';

export function useCustomerQuery() {
  return useRechargeQuery(
    async (session) => {
      return await getCustomer(session, {
        include: ['addresses', 'payment_methods'],
      });
    }
  );
}
