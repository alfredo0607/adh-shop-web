/**
 * Every text a customer sees, in Spanish (Colombia).
 *
 * Components never write customer-facing text inline; they ask for it by key
 * with `t()`. Keeping it here means a new language is a new file, not a change
 * to every component, and a missing key is a compile error rather than a blank.
 */
export const esCO = {
  brand: {
    name: 'ADH Shop',
    tagline: 'Café de especialidad',
  },
  nav: {
    home: 'Inicio',
    skipToContent: 'Saltar al contenido',
  },
  home: {
    title: 'Todo para tu mejor taza',
    lead: 'Cafeteras, molinos y granos seleccionados, con envío a toda Colombia.',
  },
  footer: {
    rights: '© {year} ADH Shop. Pagos procesados de forma segura.',
  },
  notifications: {
    dismiss: 'Cerrar aviso',
    reference: 'Referencia: {requestId}',
    region: 'Avisos',
  },
  errors: {
    api: {
      generic: 'Algo salió mal. Intenta de nuevo.',
      network: 'Sin conexión. Revisa tu internet e intenta de nuevo.',
      timeout: 'La solicitud tardó demasiado. Intenta de nuevo.',
      rateLimited: 'Demasiados intentos. Intenta de nuevo en {seconds} segundos.',
      serviceUnavailable:
        'El servicio no está disponible en este momento. Intenta en unos minutos.',
      productNotFound: 'Este producto ya no está disponible.',
      insufficientStock: 'Solo quedan {available} unidades de este producto.',
      amountMismatch: 'El total cambió desde que lo viste. Revisa el nuevo resumen.',
      reservationExpired: 'Tu reserva expiró. Vuelve a empezar la compra.',
      paymentRejected: 'No pudimos procesar la tarjeta. Revisa los datos o usa otra.',
      transactionNotPayable: 'Este pedido ya tiene un pago en curso.',
      transactionNotFound: 'No encontramos este pedido.',
      gatewayUnavailable: 'El servicio de pagos no responde. Intenta de nuevo en un momento.',
      invalidDetails: 'Revisa los datos del formulario.',
    },
    crash: {
      title: 'Algo salió mal',
      body: 'Tuvimos un problema al mostrar esta página. Tu compra no se ha visto afectada.',
      retry: 'Intentar de nuevo',
      home: 'Volver a la tienda',
    },
    notFound: {
      title: 'Página no encontrada',
      body: 'La página que buscas no existe o cambió de dirección.',
      home: 'Volver a la tienda',
    },
  },
} as const;

type Copy = typeof esCO;

/** Every valid dotted path to a string in the catalogue, e.g. "errors.crash.title". */
export type CopyKey = {
  [Section in keyof Copy]: {
    [Entry in keyof Copy[Section]]: Copy[Section][Entry] extends string
      ? `${Section & string}.${Entry & string}`
      : {
          [
            Leaf in keyof Copy[Section][Entry]
          ]: `${Section & string}.${Entry & string}.${Leaf & string}`;
        }[keyof Copy[Section][Entry]];
  }[keyof Copy[Section]];
}[keyof Copy];

export type CopyParams = Readonly<Record<string, string | number>>;

/**
 * Looks a text up by key and fills its `{placeholders}`.
 *
 * A placeholder with no value is left visible rather than silently removed, so
 * a missing parameter shows up in review instead of producing a broken sentence.
 */
export const t = (key: CopyKey, params: CopyParams = {}): string => {
  const text = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      esCO,
    ) as string;

  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
};
