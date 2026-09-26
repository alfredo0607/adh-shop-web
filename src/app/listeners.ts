import { createListenerMiddleware, isRejectedWithValue } from '@reduxjs/toolkit';

import { HANDLES_OWN_ERRORS, type EndpointName } from '@/api';
import { isAppError, isUnexpected } from '@/shared/errors/appError';
import { messageFor } from '@/shared/errors/messages';

import { notified } from './notifications/notificationsSlice';

/**
 * Reports unexpected failures globally, as a toast.
 *
 * Expected errors (out of stock, a stale total, a rejected card) belong to the
 * screen that caused them and are left alone, as is any endpoint that declares
 * it handles its own errors. Otherwise the buyer would see the same problem
 * twice: once in place and once in a toast. See docs/guide/errors.md.
 */
export const errorListener = createListenerMiddleware();

errorListener.startListening({
  matcher: isRejectedWithValue,
  effect: (action, api) => {
    const error = action.payload;
    if (!isAppError(error) || !isUnexpected(error)) return;

    const meta = action.meta as { arg?: { endpointName?: string } };
    const endpoint = meta.arg?.endpointName as EndpointName | undefined;
    if (endpoint !== undefined && HANDLES_OWN_ERRORS.has(endpoint)) return;

    const message = messageFor(error);

    api.dispatch(
      notified({
        id: message,
        tone: 'error',
        message,
        ...(error.kind === 'api' && error.requestId !== undefined
          ? { requestId: error.requestId }
          : {}),
      }),
    );
  },
});
