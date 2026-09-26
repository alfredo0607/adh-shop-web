import { setupServer } from 'msw/node';

/**
 * The network, mocked. Each test declares the responses it needs with
 * `server.use(...)`; any request nobody declared fails the test, so a
 * component can never talk to the real API by accident.
 */
export const server = setupServer();

export const API = 'https://api.test/api/v1';
