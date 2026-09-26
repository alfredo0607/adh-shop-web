import '@testing-library/jest-dom';

import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

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

// jsdom has no layout, so it does not implement scrolling. The router's scroll
// restoration calls it on every navigation.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

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
