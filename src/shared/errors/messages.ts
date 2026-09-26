import { t, type CopyKey } from '@/shared/copy/es-CO';

import type { ApiErrorCode, AppError } from './appError';

/**
 * Which copy each API error code shows. Codes absent here fall back to the
 * generic message: a new code from the API never crashes the screen.
 */
const COPY_BY_CODE: Partial<Record<ApiErrorCode, CopyKey>> = {
  PRODUCT_NOT_FOUND: 'errors.api.productNotFound',
  INSUFFICIENT_STOCK: 'errors.api.insufficientStock',
  AMOUNT_MISMATCH: 'errors.api.amountMismatch',
  RESERVATION_EXPIRED: 'errors.api.reservationExpired',
  PAYMENT_REJECTED: 'errors.api.paymentRejected',
  TRANSACTION_NOT_PAYABLE: 'errors.api.transactionNotPayable',
  TRANSACTION_NOT_FOUND: 'errors.api.transactionNotFound',
  PAYMENT_GATEWAY_UNAVAILABLE: 'errors.api.gatewayUnavailable',
  SERVICE_UNAVAILABLE: 'errors.api.serviceUnavailable',
  INVALID_CUSTOMER: 'errors.api.invalidDetails',
  INVALID_DELIVERY_ADDRESS: 'errors.api.invalidDetails',
  VALIDATION_FAILED: 'errors.api.invalidDetails',
};

/** The Spanish text a buyer sees for an error. Never the server's own message. */
export const messageFor = (error: AppError): string => {
  switch (error.kind) {
    case 'network':
      return t('errors.api.network');
    case 'timeout':
      return t('errors.api.timeout');
    case 'rate-limited':
      return t('errors.api.rateLimited', { seconds: error.retryAfterSeconds });
    case 'unknown':
      return t('errors.api.generic');
    case 'api': {
      const key = error.code === 'UNKNOWN' ? undefined : COPY_BY_CODE[error.code];
      if (key === undefined) return t('errors.api.generic');

      const available = error.details?.['available'];
      return t(key, typeof available === 'number' ? { available } : {});
    }
  }
};
