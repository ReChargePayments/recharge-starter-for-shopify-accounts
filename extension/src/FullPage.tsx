import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { Router, RouterProvider } from './router';
import { routes } from './routes';
import { RechargeSessionProvider } from './contexts/RechargeSessionContext';

export default async () => {
  render(<App />, document.body);
};

function App() {
  return (
    <RechargeSessionProvider>
      <RouterProvider>
        <Router routes={routes} />
      </RouterProvider>
    </RechargeSessionProvider>
  );
}
