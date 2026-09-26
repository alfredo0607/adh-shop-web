/**
 * The only module that reads Vite's build-time environment.
 *
 * `import.meta.env` exists only in Vite's ESM build. Jest runs CommonJS, where
 * `import.meta` is a syntax error, so tests replace this one module with a stub
 * (see jest.config.js) instead of every file that needs the environment.
 */
export const isDevelopment: boolean = import.meta.env.DEV;

/**
 * The API's origin. The generated endpoints already carry the full path
 * (`/api/v1/...`), so this is only scheme and host: empty by default, meaning
 * same-origin, which the Vite dev server proxies; the production build sets the
 * API's domain. See docs/guide/deployment.md.
 */
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? '';
