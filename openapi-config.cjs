/**
 * Generates the RTK Query endpoints and types from the API's OpenAPI document.
 *
 * The document is a committed snapshot (src/api/openapi.json), so builds and CI
 * never depend on the network. Refresh it with `pnpm api:schema`, then run
 * `pnpm api:generate`; a breaking change in the API then fails the typecheck.
 *
 * @type {import('@rtk-query/codegen-openapi').ConfigFile}
 */
module.exports = {
  schemaFile: './src/api/openapi.json',
  apiFile: './src/api/emptyApi.ts',
  apiImport: 'emptyApi',
  outputFile: './src/api/generated/adhShopApi.ts',
  exportName: 'adhShopApi',
  hooks: true,
};
