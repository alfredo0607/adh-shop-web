import type { Driver } from 'redux-remember';

/** A persistence driver backed by a Map, so tests can read exactly what was written. */
export const memoryStorage = (
  initial: Record<string, string> = {},
): Driver & {
  entries: Map<string, string>;
} => {
  const entries = new Map(Object.entries(initial));

  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value as string);
    },
  };
};
