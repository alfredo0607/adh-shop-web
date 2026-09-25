import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { RouterProvider, createBrowserRouter, type DataRouter } from 'react-router';

import { RootErrorFallback } from './errors/RootErrorFallback';
import { routes } from './router';

export interface AppProps {
  /** Injected by tests; the browser router is created otherwise. */
  router?: DataRouter;
}

export const App = ({ router }: AppProps): ReactNode => {
  // Created once per mount, not per render: a router is stateful.
  const [activeRouter] = useState(() => router ?? createBrowserRouter(routes));

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <RouterProvider router={activeRouter} />
    </ErrorBoundary>
  );
};
