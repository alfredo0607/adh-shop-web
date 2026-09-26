import { createApi } from '@reduxjs/toolkit/query/react';

import { baseQuery } from './baseQuery';

/**
 * The API slice the generated endpoints are injected into. Hand-written
 * behaviour (tags, polling, cache lifetimes) is added in ./index.ts, never in
 * the generated file.
 */
export const emptyApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Product', 'Transaction'],
  endpoints: () => ({}),
});
