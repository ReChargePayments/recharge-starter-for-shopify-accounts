import { useRechargeSession } from '../contexts/RechargeSessionContext';

export function useRecharge() {
  const { isLoading } = useRechargeSession();
  return { isLoading };
}
