import { RouteConfig } from './router';
import SubscriptionDetail from './pages/subscription-detail';
import Subscriptions from './pages/subscriptions';
import ChargeDetail from './pages/charge-detail';
import UpcomingOrders from './pages/upcoming-orders';

/**
 * Application routes
 * 
 * Order matters! More specific routes should come before dynamic ones.
 * e.g., /subscriptions/new should come before /subscriptions/:id
 */
export const routes: RouteConfig[] = [
  // Home uses subscriptions
  {
    path: '/',
    component: Subscriptions,
    meta: { title: 'Subscriptions' },
  },

  // Subscription detail
  {
    path: '/subscriptions/:id',
    component: SubscriptionDetail,
    meta: { title: 'Subscription Details' },
  },

  // Charge/Order detail
  {
    path: '/charges/:id',
    component: ChargeDetail,
    meta: { title: 'Order Details' },
  },

  // Upcoming Orders
  {
    path: '/upcoming-orders',
    component: UpcomingOrders,
    meta: { title: 'Upcoming Orders' },
  },
];

