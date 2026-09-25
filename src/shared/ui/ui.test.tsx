import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './Button/Button';
import { ErrorScreen } from './ErrorScreen/ErrorScreen';

describe('Button', () => {
  it('is a plain button by default, so it never submits a form by accident', () => {
    render(<Button>Pagar</Button>);

    expect(screen.getByRole('button', { name: 'Pagar' })).toHaveAttribute('type', 'button');
  });

  it('can submit when asked to, and forwards clicks', async () => {
    const onClick = jest.fn();
    render(
      <Button type="submit" variant="secondary" onClick={onClick}>
        Continuar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Continuar' });
    await userEvent.click(button);

    expect(button).toHaveAttribute('type', 'submit');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorScreen', () => {
  it('announces the problem and offers the given actions', () => {
    render(
      <ErrorScreen title="Algo salió mal" body="Detalle">
        <a href="/">Volver</a>
      </ErrorScreen>,
    );

    expect(screen.getByRole('alert')).toHaveAccessibleName('Algo salió mal');
    expect(screen.getByRole('link', { name: 'Volver' })).toBeInTheDocument();
  });

  it('renders without actions', () => {
    render(<ErrorScreen title="Sin acciones" body="Detalle" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
