import { CreditCard, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';

import { useGetPaymentTermsQuery, useQuoteOrderQuery, type QuoteResponse } from '@/api';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { t } from '@/shared/copy/es-CO';
import type { AppError } from '@/shared/errors/appError';
import { messageFor } from '@/shared/errors/messages';
import { formatMoney } from '@/shared/lib/money';
import { toQuoteItems } from '@/shared/lib/order';
import { Backdrop } from '@/shared/ui/Backdrop/Backdrop';
import { Button } from '@/shared/ui/Button/Button';
import { Money } from '@/shared/ui/Money/Money';

import { selectCheckout } from './checkoutSlice';
import styles from './OrderSummary.module.css';
import { payOrder } from './payOrder';
import { useCheckoutSession } from './session';

const BRAND_NAMES = { visa: 'VISA', mastercard: 'Mastercard' } as const;

/** Text with one link inside it, from copy such as "Acepto el {link} de…". */
const WithLink = ({
  text,
  label,
  href,
}: {
  text: string;
  label: string;
  href: string;
}): ReactNode => {
  const [before = '', after = ''] = text.split('{link}');
  return (
    <>
      {before}
      <a href={href} target="_blank" rel="noreferrer">
        {label}
        <span className="visually-hidden"> {t('checkout.summary.opensInNewTab')}</span>
      </a>
      {after}
    </>
  );
};

/** What a failed payment says, in terms of this order where that helps. */
const explain = (error: AppError, quote: QuoteResponse | undefined): string => {
  if (error.kind === 'api' && error.code === 'INSUFFICIENT_STOCK') {
    const productId = error.details?.['productId'];
    const available = error.details?.['available'];
    const name = quote?.items.find((item) => item.productId === productId)?.name;
    if (name !== undefined && typeof available === 'number') {
      return t('checkout.summary.shortStock', { name, available });
    }
  }
  return messageFor(error);
};

/**
 * Route `/checkout/resumen`: the summary, in a backdrop over the order, with
 * the gateway's terms to accept and the pay button. Without a card in the
 * session (a reload, a direct visit) the buyer goes back to the form: card
 * data is never stored, so it cannot be restored.
 */
export const OrderSummary = (): ReactNode => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, delivery, paymentStatus, transactionId } = useAppSelector(selectCheckout);
  const { card } = useCheckoutSession();
  const ready = card !== null && delivery !== null;

  const quote = useQuoteOrderQuery({ items: toQuoteItems(items) }, { skip: !ready });
  const terms = useGetPaymentTermsQuery(undefined, { skip: !ready });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [termsMissing, setTermsMissing] = useState(false);
  const [failure, setFailure] = useState<AppError | null>(null);
  const paying = paymentStatus === 'submitting';

  if (paymentStatus === 'submitted' && transactionId !== null) {
    return <Navigate to={`/orders/${transactionId}`} replace />;
  }
  if (!ready) {
    return <Navigate to="/checkout" replace />;
  }

  const total = quote.data?.amounts.totalInCents;

  const pay = async (): Promise<void> => {
    if (!acceptedTerms || !acceptedData) {
      setTermsMissing(true);
      return;
    }
    if (terms.data === undefined || total === undefined) return;

    setFailure(null);
    const result = await dispatch(
      payOrder(
        card,
        {
          acceptanceToken: terms.data.acceptance.token,
          personalDataAuthorizationToken: terms.data.personalDataAuthorization.token,
          tokenization: { url: terms.data.cardTokenizationUrl, publicKey: terms.data.publicKey },
        },
        total,
      ),
    );

    if (result.outcome === 'busy') return;
    if (result.outcome === 'submitted') {
      void navigate(`/orders/${result.transactionId}`, { replace: true });
      return;
    }

    setFailure(result.error);
    // The total moved: show the new one, and let the buyer pay that instead.
    if (result.error.kind === 'api' && result.error.code === 'AMOUNT_MISMATCH') {
      void quote.refetch();
    }
  };

  return (
    <Backdrop
      open
      onOpenChange={(open) => {
        if (!open && !paying) void navigate('/checkout');
      }}
      title={t('checkout.summary.title')}
      closeLabel={t('checkout.summary.close')}
      footer={
        <>
          {failure === null ? null : (
            <p className={styles.failure} role="alert">
              {explain(failure, quote.data)}
            </p>
          )}
          <Button
            onClick={() => void pay()}
            disabled={paying || total === undefined || terms.data === undefined}
          >
            {paying ? (
              <>
                <Loader2 aria-hidden className={styles.spinner} />
                {t('checkout.summary.paying')}
              </>
            ) : (
              t('checkout.summary.pay', { amount: total === undefined ? '' : formatMoney(total) })
            )}
          </Button>
        </>
      }
    >
      <div className={styles.summary}>
        {quote.data === undefined ? (
          quote.isError ? (
            <div className={styles.problem} role="alert">
              <p>{t('checkout.summary.quoteError')}</p>
              <Button variant="secondary" onClick={() => void quote.refetch()}>
                <RefreshCw aria-hidden className={styles.icon} />
                {t('catalog.retry')}
              </Button>
            </div>
          ) : (
            <p role="status" className={styles.muted}>
              {t('checkout.summary.loading')}
            </p>
          )
        ) : (
          <dl className={styles.amounts}>
            <div>
              <dt>{t('checkout.summary.products')}</dt>
              <dd>
                <Money
                  cents={quote.data.amounts.productInCents}
                  currency={quote.data.amounts.currency}
                />
              </dd>
            </div>
            <div>
              <dt>{t('checkout.summary.baseFee')}</dt>
              <dd>
                <Money
                  cents={quote.data.amounts.baseFeeInCents}
                  currency={quote.data.amounts.currency}
                />
              </dd>
            </div>
            <div>
              <dt>{t('checkout.summary.deliveryFee')}</dt>
              <dd>
                <Money
                  cents={quote.data.amounts.deliveryFeeInCents}
                  currency={quote.data.amounts.currency}
                />
              </dd>
            </div>
            <div className={styles.total}>
              <dt>{t('checkout.summary.total')}</dt>
              <dd>
                <Money
                  cents={quote.data.amounts.totalInCents}
                  currency={quote.data.amounts.currency}
                />
              </dd>
            </div>
          </dl>
        )}

        <div className={styles.details}>
          <div className={styles.detail}>
            <MapPin aria-hidden className={styles.icon} />
            <div>
              <p className={styles.label}>{t('checkout.summary.deliverTo')}</p>
              <p>{delivery.fullName}</p>
              <p className={styles.muted}>
                {[delivery.addressLine1, delivery.addressLine2, delivery.city, delivery.region]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          </div>
          <div className={styles.detail}>
            <CreditCard aria-hidden className={styles.icon} />
            <div>
              <p className={styles.label}>{t('checkout.summary.payWith')}</p>
              <p>
                {t('checkout.summary.cardEnding', {
                  brand: BRAND_NAMES[card.brand],
                  lastFour: card.lastFour,
                })}
              </p>
              <p className={styles.muted}>
                {card.installments === 1
                  ? t('checkout.installmentsOne')
                  : t('checkout.installmentsMany', { count: card.installments })}
              </p>
            </div>
          </div>
        </div>

        <fieldset
          className={styles.terms}
          aria-describedby={termsMissing ? 'terms-error' : undefined}
        >
          {terms.data === undefined ? (
            <p role="status" className={styles.muted}>
              {terms.isError
                ? t('checkout.summary.termsError')
                : t('checkout.summary.termsLoading')}
            </p>
          ) : (
            <>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                    setTermsMissing(false);
                  }}
                />
                <span>
                  <WithLink
                    text={t('checkout.summary.acceptTerms')}
                    label={t('checkout.summary.termsLink')}
                    href={terms.data.acceptance.documentUrl}
                  />
                </span>
              </label>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={acceptedData}
                  onChange={(event) => {
                    setAcceptedData(event.target.checked);
                    setTermsMissing(false);
                  }}
                />
                <span>
                  <WithLink
                    text={t('checkout.summary.acceptData')}
                    label={t('checkout.summary.dataLink')}
                    href={terms.data.personalDataAuthorization.documentUrl}
                  />
                </span>
              </label>
            </>
          )}
          {termsMissing ? (
            <p id="terms-error" className={styles.failure} role="alert">
              {t('checkout.summary.termsRequired')}
            </p>
          ) : null}
        </fieldset>
      </div>
    </Backdrop>
  );
};
