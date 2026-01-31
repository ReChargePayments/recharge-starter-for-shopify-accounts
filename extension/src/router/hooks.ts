import { useState, useEffect, useCallback, useContext, useRef } from 'preact/hooks';
import { createContext, h } from 'preact';
import type { ComponentChildren } from 'preact';
import { RouteParams, RouteConfig } from './matcher';
import { NavigationCurrentEntryChangeEvent, NavigationNavigateOptions } from '@shopify/ui-extensions/build/ts/surfaces/customer-account/api';

// Router context for route params
export interface RouterContextValue {
  params: RouteParams;
  route: RouteConfig | null;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

// Router state context - shared location and navigation functions
interface RouterStateContextValue {
  location: string;
  navigate: (to: string, options?: NavigationNavigateOptions) => void;
  goBack: () => void;
  getState: () => unknown;
  updateState: (state: unknown) => void;
}

const RouterStateContext = createContext<RouterStateContextValue | null>(null);

/**
 * Get the current pathname from Shopify's Navigation API
 */
function getCurrentPathname(): string {
  const url = navigation.currentEntry.url;
  if (!url) return '/';

  // Handle extension: protocol URLs (e.g., "extension:/subscriptions/123")
  if (url.startsWith('extension:')) {
    const path = url.replace(/^extension:/, '');
    return path || '/';
  }

  // Handle regular URLs
  try {
    return new URL(url).pathname || '/';
  } catch {
    return url.startsWith('/') ? url : '/';
  }
}

/**
 * Router Provider Component - manages shared router state
 * This ensures all components using router hooks share the same location state
 */
export function RouterProvider({ children }: { children: ComponentChildren }) {
  const [location, setLocation] = useState(getCurrentPathname);
  const pendingNavigationRef = useRef<string | null>(null);

  useEffect(() => {
    const handleNavChange = () => {
      requestAnimationFrame(() => {
        // If we have a pending navigation (from programmatic navigate), use that
        // Otherwise, read from currentEntry
        let targetPath: string;

        if (pendingNavigationRef.current) {
          targetPath = pendingNavigationRef.current;
          pendingNavigationRef.current = null;
        } else {
          targetPath = getCurrentPathname();
        }

        setLocation(prevLocation => {
          return prevLocation !== targetPath ? targetPath : prevLocation;
        });
      });
    };

    navigation.addEventListener('currententrychange', handleNavChange);
    return () => {
      navigation.removeEventListener('currententrychange', handleNavChange);
    };
  }, []);

  // Fallback: Monitor URL changes periodically in case events don't fire
  useEffect(() => {
    let lastUrl = navigation.currentEntry.url;
    const interval = setInterval(() => {
      const currentUrl = navigation.currentEntry.url;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        setLocation(getCurrentPathname());
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const navigate = useCallback((to: string, options?: NavigationNavigateOptions) => {
    // Store destination for event handler (in case currentEntry doesn't update immediately)
    pendingNavigationRef.current = to;
    navigation.navigate(to, options);
  }, []);

  const goBack = useCallback(() => {
    // Navigate to root as a fallback since we can't truly go "back" 
    // in the traditional sense with the Navigation API
    navigation.navigate('/');
  }, []);

  const getState = useCallback(() => {
    return navigation.currentEntry.getState();
  }, []);

  const updateState = useCallback((state: unknown) => {
    navigation.updateCurrentEntry({ state });
  }, []);

  const value: RouterStateContextValue = {
    location,
    navigate,
    goBack,
    getState,
    updateState,
  };

  return h(RouterStateContext.Provider, { value }, children);
}

/**
 * Main router hook - provides location and navigation functions
 * Now reads from shared context instead of creating its own state
 */
export function useRouter() {
  const context = useContext(RouterStateContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}

/**
 * Get route params from current matched route
 */
export function useParams<T extends RouteParams = RouteParams>(): T {
  const context = useContext(RouterContext);
  return (context?.params ?? {}) as T;
}

/**
 * Get the navigate function
 */
export function useNavigate() {
  const { navigate } = useRouter();
  return navigate;
}

/**
 * Get the current matched route config
 */
export function useRouteMatch() {
  const context = useContext(RouterContext);
  return context?.route ?? null;
}

/**
 * Get location (pathname) only
 */
export function useLocation(): [string, (to: string) => void] {
  const { location, navigate } = useRouter();
  return [location, navigate];
}

