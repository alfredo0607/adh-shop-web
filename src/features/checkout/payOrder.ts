import { api } from '@/api';
import { tokenizeCard, type TokenizationTarget } from '@/api/gateway';
import type { AppDispatch, RootState } from '@/app/store';
import { isAppError, type AppError } from '@/shared/errors/appError';

import {
  attemptRenewed,
  paymentFailed,
  paymentSubmitted,
  paymentSubmitting,
  transactionDiscarded,
  transactionOpened,
} from './checkoutSlice';
import type { CardInput } from './schemas/card';

/** What the buyer accepted on the summary, and where the card is tokenised. */
export interface PaymentTerms {
  acceptanceToken: string;
  personalDataAuthorizationToken: string;
  tokenization: TokenizationTarget;
}

export type PayOrderResult =
  | { outcome: 'submitted'; transactionId: string }
  | { outcome: 'failed'; error: AppError }
  /** Another attempt is already on its way; this one did nothing. */
  | { outcome: 'busy' };

const asAppError = (error: unknown): AppError => (isAppError(error) ? error : { kind: 'unknown' });

const codeOf = (error: AppError): RootState['checkout']['lastError'] =>
  error.kind === 'api' ? error.code : 'UNKNOWN';

/**
 * The API already holds a payment for this transaction: its outcome is what
 * matters now. `IDEMPOTENCY_KEY_REUSED` belongs here too: the API forgets a
 * key whose request failed, so a key it still knows carried a payment that
 * went through, or is going through.
 */
const alreadyPaying = (error: AppError): boolean =>
  error.kind === 'api' &&
  (error.code === 'TRANSACTION_NOT_PAYABLE' ||
    error.code === 'IDEMPOTENT_REQUEST_IN_PROGRESS' ||
    error.code === 'IDEMPOTENCY_KEY_REUSED');

/**
 * Pays the order: open the transaction (unless one is already open), turn
 * the card into a token with the gateway, and send the payment with the
 * attempt's idempotency key.
 *
 * The attempt is marked as started before anything is awaited, so a second
 * tap while it is on its way does nothing instead of opening a second
 * transaction. A retry on an open transaction first asks the API whether the
 * previous attempt's payment arrived after all: a new card token makes a new
 * request, which the API would not treat as a replay of the first.
 *
 * A plain thunk rather than `createAsyncThunk`, which would copy its argument,
 * the card, into every action's `meta` and so into the store and the
 * devtools. Here the card is a function argument, handed only to
 * `tokenizeCard`. See docs/guide/architecture.md.
 */
export const payOrder =
  (card: CardInput, terms: PaymentTerms, expectedTotalInCents: number) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<PayOrderResult> => {
    const { items, delivery, paymentStatus } = getState().checkout;
    if (paymentStatus === 'submitting') {
      return { outcome: 'busy' };
    }
    if (items.length === 0 || delivery === null) {
      return { outcome: 'failed', error: { kind: 'unknown' } };
    }

    dispatch(paymentSubmitting());

    let transactionId = getState().checkout.transactionId;
    if (transactionId !== null) {
      const current = await dispatch(
        api.endpoints.getTransaction.initiate(
          { id: transactionId },
          { subscribe: false, forceRefetch: true },
        ),
      );
      if (current.data?.paymentSubmitted === true) {
        dispatch(paymentSubmitted());
        return { outcome: 'submitted', transactionId };
      }
    } else {
      const created = await dispatch(
        api.endpoints.createTransaction.initiate({
          createTransactionBody: {
            items,
            expectedTotalInCents,
            customer: { fullName: delivery.fullName, email: delivery.email, phone: delivery.phone },
            deliveryAddress: {
              addressLine1: delivery.addressLine1,
              ...(delivery.addressLine2 === undefined
                ? {}
                : { addressLine2: delivery.addressLine2 }),
              city: delivery.city,
              region: delivery.region,
              ...(delivery.postalCode === undefined ? {} : { postalCode: delivery.postalCode }),
              country: delivery.country,
            },
          },
        }),
      );
      if (created.error !== undefined) {
        const error = asAppError(created.error);
        dispatch(paymentFailed(codeOf(error)));
        return { outcome: 'failed', error };
      }
      transactionId = created.data.id;
      dispatch(transactionOpened(transactionId));
    }

    const token = await tokenizeCard(card.details, terms.tokenization);
    if (!token.ok) {
      dispatch(paymentFailed(codeOf(token.error)));
      return { outcome: 'failed', error: token.error };
    }

    const request = dispatch(
      api.endpoints.payTransaction.initiate({
        id: transactionId,
        'Idempotency-Key': getState().checkout.idempotencyKey ?? '',
        payTransactionBody: {
          cardToken: token.token,
          installments: card.installments,
          acceptanceToken: terms.acceptanceToken,
          personalDataAuthorizationToken: terms.personalDataAuthorizationToken,
        },
      }),
    );
    const paid = await request;
    // The request's arguments, the card token among them, need not stay in the store.
    request.reset();

    if (paid.error !== undefined) {
      const error = asAppError(paid.error);
      if (alreadyPaying(error)) {
        dispatch(paymentSubmitted());
        return { outcome: 'submitted', transactionId };
      }

      dispatch(paymentFailed(codeOf(error)));
      if (error.kind === 'api' && error.code === 'RESERVATION_EXPIRED') {
        dispatch(transactionDiscarded());
      } else if (error.kind === 'api' && error.status < 500) {
        dispatch(attemptRenewed());
      }
      return { outcome: 'failed', error };
    }

    dispatch(paymentSubmitted());
    return { outcome: 'submitted', transactionId };
  };
