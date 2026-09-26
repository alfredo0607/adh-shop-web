import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';

import { App } from '@/app/App';
import { routes as appRoutes } from '@/app/router';
import { createStore, type AppStore } from '@/app/store';

import { memoryStorage } from './memoryStorage';

/**
 * Renders the real app at a path, with an in-memory router and a store that
 * persists to memory instead of the browser's localStorage.
 */
export const renderRoute = (
  path: string,
  routes: RouteObject[] = appRoutes,
  store: AppStore = createStore({ storage: memoryStorage() }),
): RenderResult & { store: AppStore } => ({
  ...render(<App router={createMemoryRouter(routes, { initialEntries: [path] })} store={store} />),
  store,
});
