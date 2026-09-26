import type { ReactNode } from 'react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router';

import { t } from '@/shared/copy/es-CO';
import { isDevelopment } from '@/shared/lib/runtime';
import { ErrorScreen } from '@/shared/ui/ErrorScreen/ErrorScreen';

/**
 * Shown by a route when it, or anything it renders, throws. Scoped to the route,
 * so a crash on one screen leaves the header and navigation working and the
 * buyer can simply go elsewhere.
 */
export const RouteErrorScreen = (): ReactNode => {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundScreen />;
  }

  if (isDevelopment) {
    console.error(error);
  }

  return (
    <ErrorScreen title={t('errors.crash.title')} body={t('errors.crash.body')}>
      <Link to="/" reloadDocument>
        {t('errors.crash.home')}
      </Link>
    </ErrorScreen>
  );
};

export const NotFoundScreen = (): ReactNode => (
  <ErrorScreen title={t('errors.notFound.title')} body={t('errors.notFound.body')}>
    <Link to="/">{t('errors.notFound.home')}</Link>
  </ErrorScreen>
);
