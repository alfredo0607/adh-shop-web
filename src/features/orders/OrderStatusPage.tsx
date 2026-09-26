import { CheckCircle2, Clock, PackageCheck, RefreshCw, TimerOff, XCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
  useGetTransactionDeliveryQuery,
  useGetTransactionQuery,
  type TransactionResponse,
} from '@/api';
import { useAppDispatch } from '@/app/hooks';
import { productPath } from '@/features/catalog/paths';
import { orderStarted, type OrderSource } from '@/features/checkout/checkoutSlice';
import { orderSettled } from '@/features/checkout/orderSettled';
import { t } from '@/shared/copy/es-CO';
import { isAppError } from '@/shared/errors/appError';
import { Button } from '@/shared/ui/Button/Button';
import { ErrorScreen } from '@/shared/ui/ErrorScreen/ErrorScreen';
import { Money } from '@/shared/ui/Money/Money';

import styles from './OrderStatusPage.module.css';
import { POLL_INTERVAL_MS, POLL_WINDOW_MS } from './polling';

type Outcome = 'pending' | 'approved' | 'declined' | 'error' | 'expired';

const OUTCOMES: Record<TransactionResponse['status'], Outcome> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
  VOIDED: 'declined',
  ERROR: 'error',
  EXPIRED: 'expired',
};

const ICONS = {
  pending: Clock,
  approved: CheckCircle2,
  declined: XCircle,
  error: XCircle,
  expired: TimerOff,
} as const;

const DATE = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Route `/orders/:id`: the payment's outcome. While it is pending the
 * transaction is read every two seconds; the API asks the gateway on each
 * read, so polling is all it takes to see the payment settle. After two
 * minutes the buyer checks by hand instead.
 */
export const OrderStatusPage = (): ReactNode => {
  const { id = '' } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [slow, setSlow] = useState(false);

  const status = useGetTransactionQuery({ id }, { refetchOnMountOrArgChange: true });
  const transaction = status.data;
  const pending = transaction?.status === 'PENDING';
  // Polling is a second subscription, so it can stop without dropping the data.
  useGetTransactionQuery(
    { id },
    { pollingInterval: pending && !slow ? POLL_INTERVAL_MS : 0, skip: !pending },
  );

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setSlow(true), POLL_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  // Once, when the outcome is final: close the order this browser placed.
  const source = useRef<OrderSource | null>(null);
  useEffect(() => {
    if (transaction === undefined || transaction.status === 'PENDING') return;
    source.current = dispatch(orderSettled(transaction)) ?? source.current;
  }, [dispatch, transaction]);

  const approved = transaction?.status === 'APPROVED';
  const delivery = useGetTransactionDeliveryQuery({ id }, { skip: !approved });

  if (transaction === undefined) {
    if (status.isLoading || status.isFetching) {
      return (
        <p className={styles.loading} role="status">
          {t('order.loading')}
        </p>
      );
    }
    const missing =
      isAppError(status.error) && status.error.kind === 'api' && status.error.status < 500;
    return (
      <ErrorScreen
        title={missing ? t('order.notFound') : t('order.loadError')}
        body={missing ? t('errors.api.transactionNotFound') : t('errors.api.generic')}
      >
        {missing ? null : (
          <Button variant="secondary" onClick={() => void status.refetch()}>
            {t('catalog.retry')}
          </Button>
        )}
        <Link to="/">{t('order.backToStore')}</Link>
      </ErrorScreen>
    );
  }

  const outcome = OUTCOMES[transaction.status];
  const Icon = ICONS[outcome];
  const onlyProduct = transaction.items.length === 1 ? transaction.items[0] : undefined;

  const retry = (): void => {
    dispatch(
      orderStarted({
        items: transaction.items.map(({ productId, units }) => ({ productId, units })),
        source: source.current ?? 'buy-now',
      }),
    );
    void navigate('/checkout');
  };

  return (
    <article className={styles.page}>
      <title>{`${t('order.title')} · ${t('brand.name')}`}</title>

      <section className={`${styles.outcome} ${styles[outcome]}`} aria-live="polite">
        <Icon aria-hidden className={styles.outcomeIcon} />
        <h1 className={styles.title}>{t(`order.${outcome}.title`)}</h1>
        <p>
          {outcome === 'pending' && slow ? t('order.pending.slow') : t(`order.${outcome}.body`)}
        </p>
        {outcome === 'pending' && slow ? (
          <Button variant="secondary" onClick={() => void status.refetch()}>
            <RefreshCw aria-hidden className={styles.icon} />
            {t('order.pending.refresh')}
          </Button>
        ) : null}
        <p className={styles.reference}>
          {t('order.reference', { reference: transaction.reference.slice(0, 8).toUpperCase() })}
        </p>
      </section>

      <section className={styles.card} aria-labelledby="order-items">
        <h2 id="order-items" className={styles.cardTitle}>
          {t('order.title')}
        </h2>
        <ul className={styles.items}>
          {transaction.items.map((item) => (
            <li key={item.productId} className={styles.item}>
              <span>
                {item.name} <span className={styles.muted}>× {item.units}</span>
              </span>
              <Money cents={item.lineTotalInCents} currency={transaction.amounts.currency} />
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          <span>{approved ? t('order.total') : t('order.totalDue')}</span>
          <Money cents={transaction.amounts.totalInCents} currency={transaction.amounts.currency} />
        </p>
      </section>

      {approved ? (
        <section className={styles.card} aria-labelledby="order-delivery">
          <h2 id="order-delivery" className={styles.cardTitle}>
            <PackageCheck aria-hidden className={styles.icon} />
            {t('order.delivery.title')}
          </h2>
          {delivery.data === undefined ? (
            <p className={styles.muted}>{t('order.delivery.preparing')}</p>
          ) : (
            <>
              <p>
                {t('order.delivery.recipient', {
                  name: delivery.data.recipientName,
                  phone: delivery.data.recipientPhone,
                })}
              </p>
              <p className={styles.muted}>
                {[
                  delivery.data.address.addressLine1,
                  delivery.data.address.addressLine2,
                  delivery.data.address.city,
                  delivery.data.address.region,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className={styles.estimate}>
                {t('order.delivery.estimated', {
                  date: DATE.format(new Date(delivery.data.estimatedDeliveryAt)),
                })}
              </p>
            </>
          )}
        </section>
      ) : null}

      {outcome === 'pending' ? null : (
        <div className={styles.actions}>
          {outcome === 'approved' ? null : <Button onClick={retry}>{t('order.retry')}</Button>}
          {onlyProduct === undefined ? (
            <Link to="/" className={styles.back}>
              {t('order.backToStore')}
            </Link>
          ) : (
            <Link to={productPath(onlyProduct.productId)} className={styles.back}>
              {t('order.backToProduct')}
            </Link>
          )}
        </div>
      )}
    </article>
  );
};
