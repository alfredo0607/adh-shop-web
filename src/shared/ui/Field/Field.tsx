import { ChevronDown } from 'lucide-react';
import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';

import styles from './Field.module.css';

/** What a control needs from its field to be labelled and described. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FieldProps {
  label: string;
  /** Already translated. Shown under the control, and read with it. */
  error?: string | undefined;
  hint?: string | undefined;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * A label, a control, a hint and an error, wired together: the label names
 * the control, and the hint and the error are read with it by screen readers.
 * The control itself is the caller's, so native inputs stay native.
 */
export const Field = ({ label, error, hint, className, children }: FieldProps): ReactNode => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [hint === undefined ? null : hintId, error === undefined ? null : errorId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({
        id,
        ...(describedBy === undefined ? {} : { 'aria-describedby': describedBy }),
        ...(error === undefined ? {} : { 'aria-invalid': true as const }),
      })}
      {hint === undefined ? null : (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
};

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  ref?: Ref<HTMLInputElement>;
  /** Shown inside the input, at the end, e.g. the card brand. */
  trailing?: ReactNode;
};

export const TextInput = ({ className, trailing, ref, ...props }: TextInputProps): ReactNode => (
  <span className={styles.control}>
    <input
      ref={ref}
      className={[styles.input, trailing === undefined ? null : styles.withTrailing, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
    {trailing === undefined ? null : <span className={styles.trailing}>{trailing}</span>}
  </span>
);

export type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
};

/** A native select: the phone's own picker, fully accessible, styled to match. */
export const SelectInput = ({ className, ref, ...props }: SelectInputProps): ReactNode => (
  <span className={styles.control}>
    <select
      ref={ref}
      className={[styles.input, styles.select, className].filter(Boolean).join(' ')}
      {...props}
    />
    <ChevronDown aria-hidden className={styles.chevron} />
  </span>
);
