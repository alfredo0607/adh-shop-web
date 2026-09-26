import type { RouteObject } from 'react-router';

import { HomePage } from '@/features/catalog/HomePage';
import { ProductPage } from '@/features/catalog/ProductPage';

import { NotFoundScreen, RouteErrorScreen } from './errors/RouteErrorScreen';
import { AppShell } from './layout/AppShell';

/**
 * The route table. Declared as data so tests can mount it in a memory router
 * and production in a browser router, from one definition.
 *
 * Every screen sits under the shell's error boundary: a crash in a screen
 * replaces that screen only, and the header stays usable.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      {
        errorElement: <RouteErrorScreen />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'products/:id', element: <ProductPage /> },
          { path: '*', element: <NotFoundScreen /> },
        ],
      },
    ],
  },
];
