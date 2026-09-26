import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, type RouteObject } from 'react-router';

import { App } from '@/app/App';
import { routes as appRoutes } from '@/app/router';

/** Renders the real app at a path, with an in-memory router instead of the browser's. */
export const renderRoute = (path: string, routes: RouteObject[] = appRoutes): RenderResult =>
  render(<App router={createMemoryRouter(routes, { initialEntries: [path] })} />);
