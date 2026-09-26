import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Provider } from 'react-redux';
import { RouterProvider, createBrowserRouter, type DataRouter } from 'react-router';

import { RootErrorFallback } from './errors/RootErrorFallback';
import { ToastRegion } from './notifications/ToastRegion';
import { routes } from './router';
import { createStore, type AppStore } from './store';

export interface AppProps {
  /** Injected by tests; the browser router is created otherwise. */
  router?: DataRouter;
  /** Injected by tests; a store persisting to localStorage is created otherwise. */
  store?: AppStore;
}

export const App = ({ router, store }: AppProps): ReactNode => {
  // Created once per mount, not per render: both are stateful.
  const [activeRouter] = useState(() => router ?? createBrowserRouter(routes));
  const [activeStore] = useState(() => store ?? createStore());

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <Provider store={activeStore}>
        <ToastRegion>
          <RouterProvider router={activeRouter} />
        </ToastRegion>
      </Provider>
    </ErrorBoundary>
  );
};
