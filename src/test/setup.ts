import '@testing-library/jest-dom';

/*
 * Browser APIs jsdom does not implement, which Radix Primitives and our own
 * reduced-motion styles rely on. Provided once here so no test has to.
 * See docs/guide/testing.md.
 */

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub;

const stubElementMethod = (name: string, implementation: () => unknown): void => {
  if (!(name in Element.prototype)) {
    Object.defineProperty(Element.prototype, name, {
      value: implementation,
      configurable: true,
      writable: true,
    });
  }
};

stubElementMethod('hasPointerCapture', () => false);
stubElementMethod('setPointerCapture', () => undefined);
stubElementMethod('releasePointerCapture', () => undefined);
stubElementMethod('scrollIntoView', () => undefined);

if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
