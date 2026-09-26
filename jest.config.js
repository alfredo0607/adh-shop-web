/**
 * Jest, as the brief requires, with SWC for speed.
 *
 * `jest-fixed-jsdom` is jsdom with the Fetch API globals (Request, Response,
 * TextEncoder, streams) Node provides, which MSW and RTK Query need. Plain
 * jsdom hides them.
 *
 * Tests run with `--experimental-vm-modules` (see the scripts in package.json).
 * react-router 8 ships as ESM only and uses `import.meta`, which cannot be
 * compiled down to CommonJS. With VM modules, Jest on Node 24 loads such
 * packages natively, so no third-party code has to be transformed.
 *
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: '<rootDir>/jest.environment.cjs',
  testEnvironmentOptions: { customExportConditions: [''] },
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  moduleNameMapper: {
    '^@/shared/lib/runtime$': '<rootDir>/src/test/runtimeStub.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    // CSS Modules resolve to their class names, so tests can still query by them
    // when they must; plain stylesheets and fonts resolve to nothing.
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/src/test/styleStub.ts',
    '\\.(svg|png|jpg|webp|woff2?)$': '<rootDir>/src/test/fileStub.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/api/generated/**',
    // Reads import.meta.env, which only exists in Vite's build; stubbed in tests.
    '!src/shared/lib/runtime.ts',
  ],
  // The brief asks for more than 80%. The gate is the brief's number, so CI
  // fails the moment the suite drops below it.
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
};
