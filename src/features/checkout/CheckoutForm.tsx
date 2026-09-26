import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch, type FieldError } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { t, type CopyKey } from '@/shared/copy/es-CO';
import { Button } from '@/shared/ui/Button/Button';
import { Field, SelectInput, TextInput } from '@/shared/ui/Field/Field';
import { Modal } from '@/shared/ui/Modal/Modal';
import { CardBrandMark } from '@/shared/ui/PaymentMethods/PaymentMethods';

import styles from './CheckoutForm.module.css';
import { deliverySaved, selectCheckout } from './checkoutSlice';
import {
  INSTALLMENT_OPTIONS,
  cardSchema,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  toCardInput,
  type CardInput,
} from './schemas/card';
import {
  COLOMBIAN_REGIONS,
  deliverySchema,
  toDeliveryDetails,
  toDeliveryFormValues,
} from './schemas/delivery';
import { useCheckoutSession } from './session';

const checkoutSchema = z.object({ card: cardSchema, delivery: deliverySchema });

type FormValues = z.input<typeof checkoutSchema>;

/** Validation messages are copy keys; the buyer reads them in Spanish. */
const message = (error: FieldError | undefined): string | undefined =>
  error?.message === undefined ? undefined : t(error.message as CopyKey);

/** Back to the card the buyer already typed, when they return to edit it. */
const cardDefaults = (card: CardInput | null): FormValues['card'] => ({
  number: card === null ? '' : formatCardNumber(card.details.number),
  expiry: card === null ? '' : `${card.details.expiryMonth}/${card.details.expiryYear}`,
  cvc: card?.details.cvc ?? '',
  holder: card?.details.holder ?? '',
  installments: String(card?.installments ?? 1),
});

/**
 * Route `/checkout` (index): the card and delivery form, in a modal over the
 * order. On a valid submit the delivery details go to the store and the card
 * to the checkout session, and the buyer moves on to the summary.
 */
export const CheckoutForm = (): ReactNode => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { delivery } = useAppSelector(selectCheckout);
  const { card, setCard } = useCheckoutSession();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<FormValues, unknown, z.output<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    // Quiet while a field is typed for the first time, live once it was left.
    mode: 'onTouched',
    defaultValues: { card: cardDefaults(card), delivery: toDeliveryFormValues(delivery) },
  });

  // Subscribes to the card number alone: the logo follows it without re-rendering the form.
  const brand = detectBrand(useWatch({ control, name: 'card.number' }));
  const hasErrors = Object.keys(errors).length > 0;

  const close = (): void => {
    // Back to where the buyer came from; to the store if they arrived here directly.
    void (location.key === 'default' ? navigate('/') : navigate(-1));
  };

  const submit = handleSubmit((values) => {
    dispatch(deliverySaved(toDeliveryDetails(values.delivery)));
    setCard(toCardInput(values.card));
    void navigate('/checkout/resumen');
  });

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={t('checkout.title')}
      closeLabel={t('checkout.close')}
    >
      <form className={styles.form} noValidate onSubmit={(event) => void submit(event)}>
        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('checkout.cardSection')}</legend>

          <Controller
            control={control}
            name="card.number"
            render={({ field }) => (
              <Field
                label={t('checkout.cardNumber')}
                error={message(errors.card?.number)}
                hint={t('checkout.testCards')}
              >
                {(controlProps) => (
                  <TextInput
                    {...controlProps}
                    ref={field.ref}
                    name={field.name}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(formatCardNumber(event.target.value))}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="0000 0000 0000 0000"
                    maxLength={23}
                    trailing={brand === 'unknown' ? undefined : <CardBrandMark brand={brand} />}
                  />
                )}
              </Field>
            )}
          />

          <div className={styles.row}>
            <Controller
              control={control}
              name="card.expiry"
              render={({ field }) => (
                <Field label={t('checkout.expiry')} error={message(errors.card?.expiry)}>
                  {(controlProps) => (
                    <TextInput
                      {...controlProps}
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onBlur={field.onBlur}
                      onChange={(event) =>
                        field.onChange(formatExpiry(event.target.value, field.value))
                      }
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder={t('checkout.expiryPlaceholder')}
                      maxLength={5}
                    />
                  )}
                </Field>
              )}
            />
            <Field
              label={t('checkout.cvc')}
              error={message(errors.card?.cvc)}
              hint={t('checkout.cvcHint')}
            >
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  {...register('card.cvc')}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={3}
                  type="password"
                />
              )}
            </Field>
          </div>

          <Field label={t('checkout.holder')} error={message(errors.card?.holder)}>
            {(controlProps) => (
              <TextInput
                {...controlProps}
                {...register('card.holder')}
                autoComplete="cc-name"
                autoCapitalize="characters"
                maxLength={60}
              />
            )}
          </Field>

          <Field label={t('checkout.installments')}>
            {(controlProps) => (
              <SelectInput {...controlProps} {...register('card.installments')}>
                {INSTALLMENT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count === 1
                      ? t('checkout.installmentsOne')
                      : t('checkout.installmentsMany', { count })}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </fieldset>

        <fieldset className={styles.section}>
          <legend className={styles.legend}>{t('checkout.deliverySection')}</legend>

          <Field label={t('checkout.fullName')} error={message(errors.delivery?.fullName)}>
            {(controlProps) => (
              <TextInput
                {...controlProps}
                {...register('delivery.fullName')}
                autoComplete="name"
                maxLength={100}
              />
            )}
          </Field>

          <div className={styles.row}>
            <Field label={t('checkout.email')} error={message(errors.delivery?.email)}>
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  {...register('delivery.email')}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={254}
                />
              )}
            </Field>
            <Field label={t('checkout.phone')} error={message(errors.delivery?.phone)}>
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  {...register('delivery.phone')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                />
              )}
            </Field>
          </div>

          <Field label={t('checkout.addressLine1')} error={message(errors.delivery?.addressLine1)}>
            {(controlProps) => (
              <TextInput
                {...controlProps}
                {...register('delivery.addressLine1')}
                autoComplete="address-line1"
                maxLength={120}
              />
            )}
          </Field>

          <Field label={t('checkout.addressLine2')} error={message(errors.delivery?.addressLine2)}>
            {(controlProps) => (
              <TextInput
                {...controlProps}
                {...register('delivery.addressLine2')}
                autoComplete="address-line2"
                maxLength={120}
              />
            )}
          </Field>

          <div className={styles.row}>
            <Field label={t('checkout.city')} error={message(errors.delivery?.city)}>
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  {...register('delivery.city')}
                  autoComplete="address-level2"
                  maxLength={60}
                />
              )}
            </Field>
            <Field label={t('checkout.region')} error={message(errors.delivery?.region)}>
              {(controlProps) => (
                <SelectInput
                  {...controlProps}
                  {...register('delivery.region')}
                  autoComplete="address-level1"
                >
                  <option value="">{t('checkout.regionPlaceholder')}</option>
                  {COLOMBIAN_REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
          </div>

          <div className={styles.row}>
            <Field label={t('checkout.postalCode')} error={message(errors.delivery?.postalCode)}>
              {(controlProps) => (
                <TextInput
                  {...controlProps}
                  {...register('delivery.postalCode')}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                />
              )}
            </Field>
            <Field label={t('checkout.country')}>
              {(controlProps) => (
                <TextInput {...controlProps} value={t('checkout.countryValue')} readOnly />
              )}
            </Field>
          </div>
        </fieldset>

        <div className={styles.actions}>
          {isSubmitted && hasErrors ? (
            <p className={styles.formError} role="alert">
              {t('checkout.errorsFound')}
            </p>
          ) : null}
          <Button type="submit">{t('checkout.continue')}</Button>
          <p className={styles.secure}>
            <Lock aria-hidden className={styles.lock} />
            {t('checkout.secureNote')}
          </p>
        </div>
      </form>
    </Modal>
  );
};
