/**
 * The only module that reads Vite's build-time environment.
 *
 * `import.meta.env` exists only in Vite's ESM build. Jest runs CommonJS, where
 * `import.meta` is a syntax error, so tests replace this one module with a stub
 * (see jest.config.js) instead of every file that needs the environment.
 */
export const isDevelopment: boolean = import.meta.env.DEV;
