import { useMemo } from 'preact/hooks';
import { listSubscriptions } from '@rechargeapps/storefront-client';
import { useSubscriptionsQuery } from './useSubscriptionsQuery';

type Subscription = Awaited<ReturnType<typeof listSubscriptions>>['subscriptions'][number];

/**
 * Get a single subscription by ID from the subscriptions list
 */
export function useSubscriptionById(subscriptionId: number | null) {
  const { data: subscriptions, isInitialLoading, error } = useSubscriptionsQuery();

  const subscription = useMemo(() => {
    if (!subscriptionId || !subscriptions || subscriptions.length === 0) {
      return null;
    }
    return subscriptions.find((sub: Subscription) => sub.id === subscriptionId) || null;
  }, [subscriptionId, subscriptions]);

  return {
    data: subscription,
    isInitialLoading,
    error: subscriptionId && !subscription && !isInitialLoading 
      ? new Error('Subscription not found') 
      : error,
  };
}
