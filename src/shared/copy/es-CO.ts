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
    categories: 'Categorías',
  },
  header: {
    announcement: 'Envío a toda Colombia · Pago seguro',
    search: 'Buscar productos',
    favorites: 'Favoritos',
    account: 'Mi cuenta',
    actions: 'Accesos rápidos',
    comingSoon: 'Esta función estará disponible muy pronto.',
  },
  home: {
    title: 'Todo para tu mejor taza',
    lead: 'Cafeteras, molinos y granos seleccionados, con envío a toda Colombia.',
  },
  catalog: {
    title: 'Nuestros productos',
    loading: 'Cargando productos…',
    empty: 'Por ahora no hay productos disponibles. Vuelve pronto.',
    loadError: 'No pudimos cargar los productos.',
    retry: 'Reintentar',
    showing: 'Mostrando {from}–{to} de {total} productos',
    showingOne: '1 producto',
    noMatches: 'Ningún producto coincide con tu búsqueda.',
    noMatchesHint: 'Prueba con otras palabras o quita algunos filtros.',
    clearFilters: 'Limpiar filtros',
    clearSearch: 'Borrar búsqueda',
    filters: 'Filtros',
    searchLabel: 'Buscar',
    searchPlaceholder: 'Cafeteras, molinos, café…',
    categoriesLabel: 'Categoría',
    allCategories: 'Todas',
    priceLabel: 'Precio',
    anyPrice: 'Cualquier precio',
    inStockOnly: 'Solo disponibles',
    sortLabel: 'Ordenar por',
  },
  cart: {
    title: 'Tu carrito',
    open: 'Carrito',
    openWithOne: 'Carrito, 1 producto',
    openWithCount: 'Carrito, {count} productos',
    close: 'Cerrar carrito',
    empty: 'Tu carrito está vacío.',
    emptyHint: 'Explora el catálogo y agrega lo que te guste.',
    browse: 'Explorar productos',
    add: 'Agregar al carrito',
    addNamed: 'Agregar {name} al carrito',
    added: 'Agregaste {name} al carrito.',
    full: 'Tu carrito admite hasta {max} productos distintos.',
    remove: 'Quitar {name} del carrito',
    units: 'Cantidad de {name}',
    unitPrice: '{price} c/u',
    unavailable: 'No disponible',
    unavailableNote: 'Quita los productos que ya no están disponibles para continuar.',
    subtotal: 'Subtotal',
    feesNote: 'La tarifa base y el envío se suman en el resumen, antes de pagar.',
    checkout: 'Ir a pagar',
    keepShopping: 'Seguir comprando',
    loading: 'Cargando tu carrito…',
  },
  checkout: {
    title: 'Pago con tarjeta de crédito',
    close: 'Cerrar el pago',
    yourOrder: 'Tu pedido',
    preparing: 'Preparando tu pedido…',
    cardSection: 'Tarjeta de crédito',
    deliverySection: 'Datos de entrega',
    cardNumber: 'Número de la tarjeta',
    cardBrand: 'Tarjeta {brand}',
    testCards:
      'Tarjetas de prueba: 4242 4242 4242 4242 (aprobada) y 4111 1111 1111 1111 (rechazada).',
    expiry: 'Vencimiento',
    expiryPlaceholder: 'MM/AA',
    cvc: 'CVC',
    cvcHint: 'Los 3 dígitos al respaldo.',
    holder: 'Nombre en la tarjeta',
    installments: 'Cuotas',
    installmentsOne: '1 cuota',
    installmentsMany: '{count} cuotas',
    fullName: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Celular',
    addressLine1: 'Dirección',
    addressLine2: 'Apartamento, torre u oficina (opcional)',
    city: 'Ciudad o municipio',
    region: 'Departamento',
    regionPlaceholder: 'Selecciona un departamento',
    postalCode: 'Código postal (opcional)',
    country: 'País',
    countryValue: 'Colombia',
    secureNote: 'Los datos de tu tarjeta van directo a la pasarela de pagos. Nunca los guardamos.',
    continue: 'Continuar al resumen',
    errorsFound: 'Revisa los campos marcados.',
    errors: {
      required: 'Este campo es obligatorio.',
      cardNumber: 'Revisa el número de la tarjeta.',
      cardUnsupported: 'Solo aceptamos tarjetas VISA y Mastercard.',
      expiryFormat: 'Usa el formato MM/AA.',
      expiryPast: 'La tarjeta está vencida o la fecha no es válida.',
      cvc: 'El CVC tiene 3 dígitos.',
      holderLength: 'Escribe el nombre como aparece en la tarjeta (5 a 60 letras).',
      holderLetters: 'Usa solo letras y espacios.',
      fullName: 'Escribe tu nombre completo (3 a 100 caracteres).',
      email: 'Escribe un correo válido.',
      phone: 'Escribe un celular de 7 a 15 dígitos.',
      address: 'Escribe la dirección completa (5 a 120 caracteres).',
      city: 'Escribe la ciudad o el municipio.',
      region: 'Selecciona un departamento.',
      postalCode: 'El código postal tiene 6 dígitos.',
    },
    summary: {
      title: 'Resumen de tu pedido',
      products: 'Productos',
      baseFee: 'Tarifa base',
      deliveryFee: 'Envío',
      total: 'Total a pagar',
      loading: 'Calculando el total…',
      deliverTo: 'Entregamos a',
      payWith: 'Pagas con',
      cardEnding: '{brand} terminada en {lastFour}',
      edit: 'Editar datos',
      quoteError: 'No pudimos calcular el total. Intenta de nuevo.',
    },
  },
  categories: {
    'coffee-makers': 'Cafeteras',
    grinders: 'Molinos',
    brewing: 'Métodos de preparación',
    accessories: 'Accesorios',
    coffee: 'Café',
  },
  prices: {
    'hasta-50000': 'Hasta $50.000',
    '50000-200000': '$50.000 a $200.000',
    '200000-500000': '$200.000 a $500.000',
    'desde-500000': 'Más de $500.000',
  },
  sorts: {
    relevancia: 'Recomendados',
    'precio-asc': 'Menor precio',
    'precio-desc': 'Mayor precio',
    nombre: 'Nombre (A–Z)',
  },
  pagination: {
    label: 'Paginación del catálogo',
    previous: 'Página anterior',
    next: 'Página siguiente',
    page: 'Página {page}',
  },
  payments: {
    title: 'Medios de pago',
    visa: 'VISA',
    mastercard: 'Mastercard',
  },
  stock: {
    soldOut: 'Agotado',
    lastOne: 'Última unidad',
    low: 'Últimas {units} unidades',
    available: '{units} disponibles',
  },
  product: {
    back: 'Volver a la tienda',
    loading: 'Cargando producto…',
    loadError: 'No pudimos cargar este producto.',
    notFoundTitle: 'Producto no encontrado',
    unitsLabel: 'Cantidad',
    decrease: 'Quitar una unidad',
    increase: 'Agregar una unidad',
    maxPerOrder: 'Puedes llevar hasta {max} unidades por pedido.',
    maxInStock: 'Hay {max} unidades disponibles.',
    subtotal: 'Subtotal',
    pay: 'Pagar con tarjeta de crédito',
    feesNote: 'La tarifa base y el envío se suman en el resumen, antes de pagar.',
    secure: 'Pago seguro con tarjeta de crédito',
    favorite: 'Guardar {name} en favoritos',
    soldOut: 'Este producto está agotado por ahora.',
    imageUnavailable: 'Imagen no disponible',
  },
  footer: {
    shop: 'Tienda',
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
