import { esCO, t } from './es-CO';

describe('t', () => {
  it('returns the Spanish text for a key', () => {
    expect(t('errors.notFound.title')).toBe('Página no encontrada');
    expect(t('brand.name')).toBe(esCO.brand.name);
  });

  it('fills placeholders from the parameters', () => {
    expect(t('footer.rights', { year: 2026 })).toBe(
      '© 2026 ADH Shop. Pagos procesados de forma segura.',
    );
  });

  it('leaves a placeholder visible when its parameter is missing', () => {
    // A broken sentence is caught in review; a silently dropped value is not.
    expect(t('footer.rights')).toContain('{year}');
  });
});
