import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from './Button/Button';
import { ErrorScreen } from './ErrorScreen/ErrorScreen';
import { Money } from './Money/Money';
import { Stepper } from './Stepper/Stepper';

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

describe('Money', () => {
  it('shows pesos and keeps the machine-readable amount', () => {
    render(<Money cents={2_790_000} />);

    expect(screen.getByText('$ 27.900')).toHaveAttribute('value', '27900');
  });
});

describe('Stepper', () => {
  const renderStepper = (value: number, hint?: string) => {
    const onChange = jest.fn();
    render(
      <Stepper
        label="Cantidad"
        value={value}
        min={1}
        max={3}
        onChange={onChange}
        decreaseLabel="Menos"
        increaseLabel="Más"
        {...(hint === undefined ? {} : { hint })}
      />,
    );
    return onChange;
  };

  it('steps down and up by one', async () => {
    const onChange = renderStepper(2);

    await userEvent.click(screen.getByRole('button', { name: 'Menos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Más' }));

    expect(onChange.mock.calls).toEqual([[1], [3]]);
  });

  it('cannot leave its bounds', () => {
    renderStepper(3);

    expect(screen.getByRole('button', { name: 'Más' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Menos' })).toBeEnabled();
  });

  it('describes the group with its hint, when there is one', () => {
    renderStepper(1, 'Máximo 3');

    expect(screen.getByRole('group', { name: 'Cantidad' })).toHaveAccessibleDescription('Máximo 3');
    expect(screen.getByRole('button', { name: 'Menos' })).toBeDisabled();
  });

  it('has no description without a hint', () => {
    renderStepper(2);

    expect(screen.getByRole('group', { name: 'Cantidad' })).not.toHaveAttribute('aria-describedby');
  });
});
