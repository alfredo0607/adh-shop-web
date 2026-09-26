import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { selectResumeTarget } from '@/features/checkout/checkoutSlice';

import { useAppSelector } from '../hooks';
import { selectRehydrated } from '../persistence';

/**
 * Takes a buyer who reloads the store while a payment is in flight to that
 * payment's status, where polling finds out how it ended. Only on the first
 * page the app opens, and only from the home page: a buyer who then chooses
 * to browse is left to browse. See docs/guide/checkout-flow.md.
 */
export const ResumeOrder = (): ReactNode => {
  const rehydrated = useAppSelector(selectRehydrated);
  const target = useAppSelector(selectResumeTarget);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const decided = useRef(false);

  useEffect(() => {
    if (!rehydrated || decided.current) return;
    decided.current = true;
    if (pathname === '/' && target.screen === 'status') {
      void navigate(`/orders/${target.transactionId}`, { replace: true });
    }
  }, [rehydrated, target, pathname, navigate]);

  return null;
};
