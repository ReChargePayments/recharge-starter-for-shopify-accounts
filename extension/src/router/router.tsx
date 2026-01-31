import { ComponentChildren } from 'preact';
import { RouterContext, useRouter, useNavigate } from './hooks';
import { findRoute, RouteConfig } from './matcher';

interface RouterProps {
  routes: RouteConfig[];
  notFound?: () => ComponentChildren;
}

/**
 * Default 404 component
 */
function DefaultNotFound() {
  const navigate = useNavigate();

  return (
    <s-page heading="Page Not Found">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-text>The page you're looking for doesn't exist.</s-text>
          <s-button onClick={() => navigate('/')}>
            Go to Subscriptions
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}

/**
 * Main Router component
 * Matches current location against route configs and renders the matched component
 */
export function Router({ routes, notFound: NotFound = DefaultNotFound }: RouterProps) {
  const { location } = useRouter();

  const match = findRoute(routes, location);

  if (!match) {
    return <NotFound />;
  }

  const { route, params } = match;
  const Component = route.component;

  return (
    <RouterContext.Provider value={{ params, route }}>
      <Component />
    </RouterContext.Provider>
  );
}

interface LinkProps {
  href: string;
  children: ComponentChildren;
  [key: string]: unknown;
}

/**
 * Link component - wraps s-link and uses Navigation API
 * Always uses programmatic navigation to ensure events fire reliably
 */
export function Link({ href, children, onClick, ...props }: LinkProps) {
  const navigate = useNavigate();

  return (
    <s-link
      href={href}
      onClick={(e) => {
        // Prevent native navigation - use Navigation API instead
        if (e.preventDefault) {
          e.preventDefault();
        }
        
        // Call custom onClick handler if provided (for side effects like modals)
        if (onClick && typeof onClick === 'function') {
          onClick(e);
        }
        
        // Always use Navigation API to ensure events fire
        navigate(href);
      }}
      {...props}
    >
      {children}
    </s-link>
  );
}

interface LinkButtonProps {
  href: string;
  children: ComponentChildren;
  variant?: 'primary' | 'secondary' | 'auto';
  tone?: 'auto' | 'critical';
  [key: string]: unknown;
}

/**
 * Button that navigates on click
 */
export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  const navigate = useNavigate();

  return (
    <s-button onClick={() => navigate(href)} {...props}>
      {children}
    </s-button>
  );
}

/**
 * Redirect component - navigates immediately on mount
 */
interface RedirectProps {
  to: string;
}

export function Redirect({ to }: RedirectProps) {
  const navigate = useNavigate();

  // Navigate on mount
  navigate(to);

  return null;
}

