import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { memoryStorage } from '@/test/memoryStorage';

import { createStore } from '../store';
import {
  MAX_VISIBLE_NOTIFICATIONS,
  dismissed,
  notificationsSlice,
  notified,
  selectNotifications,
} from './notificationsSlice';
import { ToastRegion } from './ToastRegion';

describe('notifications slice', () => {
  const reduce = notificationsSlice.reducer;

  it('replaces a notification with the same id instead of stacking it', () => {
    let state = reduce(undefined, notified({ id: 'a', tone: 'error', message: 'A' }));
    state = reduce(state, notified({ id: 'a', tone: 'error', message: 'A again' }));

    expect(state.items).toEqual([{ id: 'a', tone: 'error', message: 'A again' }]);
  });

  it(`keeps at most ${MAX_VISIBLE_NOTIFICATIONS}, dropping the oldest`, () => {
    let state = reduce(undefined, { type: 'init' });
    for (const id of ['1', '2', '3', '4']) {
      state = reduce(state, notified({ id, tone: 'info', message: id }));
    }

    expect(state.items.map((item) => item.id)).toEqual(['2', '3', '4']);
  });

  it('removes a dismissed notification', () => {
    const state = reduce(
      reduce(undefined, notified({ id: 'a', tone: 'info', message: 'A' })),
      dismissed('a'),
    );

    expect(state.items).toEqual([]);
  });
});

describe('ToastRegion', () => {
  it('shows each notification and lets the buyer dismiss it', async () => {
    const store = createStore({ storage: memoryStorage() });
    store.dispatch(
      notified({ id: 'x', tone: 'error', message: 'Sin conexión.', requestId: 'req-9' }),
    );

    render(
      <Provider store={store}>
        <ToastRegion>
          <p>page</p>
        </ToastRegion>
      </Provider>,
    );

    expect(screen.getByText('Sin conexión.')).toBeInTheDocument();
    expect(screen.getByText('Referencia: req-9')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(selectNotifications(store.getState())).toEqual([]);
  });
});
