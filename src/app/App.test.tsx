import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import type { RouteObject } from 'react-router';

import { renderRoute } from '@/test/renderRoute';

import { App } from './App';

import { RootErrorFallback } from './errors/RootErrorFallback';
import { RouteErrorScreen } from './errors/RouteErrorScreen';
import { AppShell } from './layout/AppShell';

const Crash = (): never => {
  throw new Error('render failed');
};

describe('App', () => {
  beforeEach(() => {
    // React logs caught render errors; the assertions below are what matter.
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the storefront shell and the home screen, in Spanish', () => {
    renderRoute('/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Todo para tu mejor taza' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'ADH Shop, Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      `© ${new Date().getFullYear()} ADH Shop`,
    );
  });

  it('creates its own browser router when none is injected', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Todo para tu mejor taza' }),
    ).toBeVisible();
  });

  it('lets keyboard users skip straight to the content', () => {
    renderRoute('/');

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('answers an unknown address with a not-found screen inside the shell', () => {
    renderRoute('/no-existe');

    expect(screen.getByRole('alert')).toHaveAccessibleName('Página no encontrada');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('contains a crashing screen to its route, keeping the header usable', () => {
    const routes: RouteObject[] = [
      {
        element: <AppShell />,
        children: [
          { errorElement: <RouteErrorScreen />, children: [{ index: true, element: <Crash /> }] },
        ],
      },
    ];

    renderRoute('/', routes);

    expect(screen.getByRole('alert')).toHaveAccessibleName('Algo salió mal');
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows the not-found screen when a route reports a 404', () => {
    const routes: RouteObject[] = [
      {
        path: '/',
        loader: () => {
          // A thrown Response is React Router's documented way to answer a route with a status.
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw new Response('Not Found', { status: 404 });
        },
        element: <p>unreachable</p>,
        errorElement: <RouteErrorScreen />,
      },
    ];

    renderRoute('/', routes);

    return expect(
      screen.findByRole('alert', { name: 'Página no encontrada' }),
    ).resolves.toBeVisible();
  });
});

describe('RootErrorFallback', () => {
  it('replaces a crashed app with a recovery screen that can retry', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldCrash = true;
    const MaybeCrash = (): string => {
      if (shouldCrash) throw new Error('boom');
      return 'recovered';
    };

    render(
      <ErrorBoundary FallbackComponent={RootErrorFallback}>
        <MaybeCrash />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveAccessibleName('Algo salió mal');

    shouldCrash = false;
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    jest.restoreAllMocks();
  });
});
