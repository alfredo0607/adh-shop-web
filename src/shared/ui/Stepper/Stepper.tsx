import { Minus, Plus } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import styles from './Stepper.module.css';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** Shown under the control, e.g. why the maximum is what it is. */
  hint?: string;
}

/**
 * A whole-number picker with large minus and plus buttons: easier on a phone
 * than a number input, and it cannot hold a value outside its bounds.
 */
export const Stepper = ({
  label,
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
  hint,
}: StepperProps): ReactNode => {
  const labelId = useId();
  const hintId = useId();

  return (
    <div className={styles.field}>
      <span id={labelId} className={styles.label}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={hint === undefined ? undefined : hintId}
        className={styles.stepper}
      >
        <button
          type="button"
          className={styles.button}
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden />
        </button>
        <output className={styles.value} aria-live="polite" aria-atomic>
          {value}
        </output>
        <button
          type="button"
          className={styles.button}
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden />
        </button>
      </div>
      {hint === undefined ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
};
