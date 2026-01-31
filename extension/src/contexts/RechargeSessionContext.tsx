import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'
import { ComponentChildren } from 'preact';
import { Session } from '@rechargeapps/storefront-client';
import { initRecharge } from '@rechargeapps/storefront-client';
import { fetchRechargeSession } from '../utils/rechargeSession';
import { setRechargeSessionGetter } from '../utils/rechargeSdk';
import { isJwtExpired } from '../utils/jwt';
import { env } from '../env';

const STORE_DOMAIN = String(shopify.settings.value?.store_url ?? env.STORE_DOMAIN);
const STORAGE_KEY = 'recharge_session';

interface StoredSession {
  session: Session;
  jwt?: string; // Store JWT separately for expiration checking
  storedAt: number;
}

interface RechargeSessionContextValue {
  session: Session | null;
  isLoading: boolean;
  getSession: () => Promise<Session>;
  refreshSession: () => Promise<Session>;
}

const RechargeSessionContext = createContext<RechargeSessionContextValue | null>(null);

export function RechargeSessionProvider({ children }: { children: ComponentChildren }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async (): Promise<Session> => {
    const newSession = await fetchRechargeSession();

    if (!newSession) {
      throw new Error('Failed to get Recharge session');
    }

    // Extract JWT from session for storage and expiration checking
    // Session object contains apiToken field with the JWT
    const jwt = typeof newSession === 'object' && newSession !== null
      ? (newSession as any).apiToken || null
      : typeof newSession === 'string'
        ? newSession
        : null;

    setSession(newSession);

    // Store session in storage for persistence across page refreshes
    // Shopify's extensions have a Storage API: A key-value storage object for extension targets.
    // Stored data is only available to this specific app but can be shared across multiple extension targets.
    // So its "keyed" to this app, but if this app had more extensions (other full pages) we could leverage it in those.
    try {
      const stored: StoredSession = {
        session: newSession,
        jwt: jwt || undefined,
        storedAt: Date.now(),
      };
      await shopify.storage.write(STORAGE_KEY, stored);
    } catch (err) {
      // Storage failures shouldn't break the flow
      console.warn('Failed to store session in storage:', err);
    }

    return newSession;
  }, []);

  const getSession = useCallback(async (): Promise<Session> => {
    // in-memory hit
    if (session) return session;

    let stored: StoredSession | undefined;
    try {
      stored = await shopify.storage.read<StoredSession>(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to read session from storage:', err);
    }
    // nothing stored
    if (!stored?.session) return refreshSession();

    const jwt = (stored.jwt ||
      (typeof stored.session === 'string' ? stored.session :
        (stored.session as any).apiToken)) as string | undefined;

    // invalid / expired
    if (!jwt || isJwtExpired(jwt)) {
      await shopify.storage.delete(STORAGE_KEY);
      return refreshSession();
    }

    setSession(stored.session);
    return stored.session;
  }, [session, refreshSession]);

  // Initialize Recharge SDK with loginRetryFn
  useEffect(() => {
    initRecharge({
      storeIdentifier: STORE_DOMAIN,
      appName: env.RECHARGE_APP_NAME,
      appVersion: env.RECHARGE_APP_VERSION,
      loginRetryFn: async () => {
        // When a 401 occurs, check storage first for a valid session,
        // then refresh if needed (getSession handles this logic)
        // Clear in-memory session to force getSession to check storage
        setSession(null);
        return await getSession();
      },
    });

    // Try to load session from storage first, then fetch if needed
    getSession()
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));
  }, [getSession]); // Re-initialize if getSession changes.

  // Register getSession function for rechargeSdk utility functions (update when getSession changes)
  useEffect(() => {
    setRechargeSessionGetter(getSession);
  }, [getSession]);

  const value: RechargeSessionContextValue = {
    session,
    isLoading,
    getSession,
    refreshSession,
  };

  return (
    <RechargeSessionContext.Provider value={value}>
      {children}
    </RechargeSessionContext.Provider>
  );
}

export function useRechargeSession() {
  const context = useContext(RechargeSessionContext);
  if (!context) {
    throw new Error('useRechargeSession must be used within RechargeSessionProvider');
  }
  return context;
}
