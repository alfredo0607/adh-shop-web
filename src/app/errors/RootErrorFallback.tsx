import type { ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';

import { t } from '@/shared/copy/es-CO';
import { Button } from '@/shared/ui/Button/Button';
import { ErrorScreen } from '@/shared/ui/ErrorScreen/ErrorScreen';

/**
 * The last line of defence: something failed outside any route (the router
 * itself, a provider). Without it the buyer would face a blank page.
 */
export const RootErrorFallback = ({ resetErrorBoundary }: FallbackProps): ReactNode => (
  <ErrorScreen title={t('errors.crash.title')} body={t('errors.crash.body')}>
    <Button onClick={resetErrorBoundary}>{t('errors.crash.retry')}</Button>
  </ErrorScreen>
);
