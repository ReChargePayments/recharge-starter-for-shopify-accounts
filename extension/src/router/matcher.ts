/**
 * Lightweight router utilities for Customer Account Extensions
 * Uses Shopify's Navigation API under the hood
 */

export interface RouteParams {
  [key: string]: string;
}

export interface RouteConfig {
  path: string;
  component: () => JSX.Element;
  meta?: Record<string, unknown>;
}

export interface RouteMatch {
  route: RouteConfig;
  params: RouteParams;
}

/**
 * Match a path pattern against a URL pathname
 * Supports: /static, /users/:id, /users/:id/orders/:orderId, /*
 */
export function matchPath(pattern: string, pathname: string): RouteParams | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);

  // Handle catch-all wildcard
  if (pattern.endsWith('/*')) {
    const basePattern = pattern.slice(0, -2);
    const baseParts = basePattern.split('/').filter(Boolean);
    if (pathParts.length < baseParts.length) return null;

    const params: RouteParams = {};
    for (let i = 0; i < baseParts.length; i++) {
      if (baseParts[i].startsWith(':')) {
        params[baseParts[i].slice(1)] = pathParts[i];
      } else if (baseParts[i] !== pathParts[i]) {
        return null;
      }
    }
    params['*'] = '/' + pathParts.slice(baseParts.length).join('/');
    return params;
  }

  if (patternParts.length !== pathParts.length) return null;

  const params: RouteParams = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

/**
 * Find the first matching route from a route config array
 */
export function findRoute(routes: RouteConfig[], pathname: string): RouteMatch | null {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params !== null) {
      return { route, params };
    }
  }
  return null;
}

/**
 * Extract pathname from a URL string
 */
export function getPathname(url: string | null): string {
  if (!url) return '/';
  try {
    return new URL(url).pathname;
  } catch {
    // If it's already a pathname (starts with /)
    return url.startsWith('/') ? url : '/' + url;
  }
}

