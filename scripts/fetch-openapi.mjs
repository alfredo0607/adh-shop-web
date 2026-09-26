/**
 * Saves the API's OpenAPI document as the snapshot the client is generated
 * from (`pnpm api:schema`, then `pnpm api:generate`). A file rather than an
 * inline `node -e`, which Windows' shell cuts short at the newline it writes.
 *
 *   API_DOCS_URL=http://localhost:3000/api/docs-json pnpm api:schema
 */
import { writeFile } from 'node:fs/promises';

const url = process.env.API_DOCS_URL ?? 'https://adh-api.alfredo-dominguez.dev/api/docs-json';

const response = await fetch(url);
if (!response.ok) {
  throw new Error(`${url} answered ${response.status}`);
}

const document = await response.json();
await writeFile(
  new URL('../src/api/openapi.json', import.meta.url),
  `${JSON.stringify(document, null, 2)}\n`,
);
process.stdout.write(`Saved the OpenAPI document from ${url}\n`);
