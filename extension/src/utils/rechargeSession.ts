import { Session } from "@rechargeapps/storefront-client";
import { env } from '../env';

const RECHARGE_JWT_API_URL = String(shopify.settings.value?.auth_api_url ?? env.RECHARGE_JWT_API_URL);

/**
 * Fetch ReCharge session
 */
export async function fetchRechargeSession(): Promise<Session | null> {
  const token = await shopify.sessionToken.get();
  const { authenticatedAccount } = shopify;
  if (!authenticatedAccount) return null;

  try {
    const res = await fetch(RECHARGE_JWT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `JWT fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.customerSession) throw new Error('Invalid JWT response');

    return data.customerSession;
  } catch (err) {
    console.error('Failed to fetch ReCharge session:', err);
    throw err;
  }
}
