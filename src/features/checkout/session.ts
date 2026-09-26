import { useOutletContext } from 'react-router';

import type { CardInput } from './schemas/card';

/**
 * The card, while the checkout is open. It lives in the React state of the
 * `/checkout` route and reaches the form and the summary through the router's
 * outlet context: never Redux, never storage. Leaving the checkout unmounts
 * the route and the card with it; a reload asks for it again.
 * See docs/guide/security.md.
 */
export interface CheckoutSession {
  card: CardInput | null;
  setCard: (card: CardInput | null) => void;
}

export const useCheckoutSession = (): CheckoutSession => useOutletContext<CheckoutSession>();
