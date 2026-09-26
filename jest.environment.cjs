/**
 * jsdom with Node's own abort primitives.
 *
 * jest-fixed-jsdom already exposes Node's fetch, Request and Response. But
 * AbortController, AbortSignal and DOMException still come from jsdom, and
 * Node's fetch rejects a signal from another realm, so every request that
 * carries one (RTK Query always does) fails as if the network were down.
 * Exposing Node's versions makes fetch and its signals agree, as they do in a
 * real browser.
 */
const jestFixedJsdom = require('jest-fixed-jsdom');
const FixedJSDOMEnvironment = jestFixedJsdom.default ?? jestFixedJsdom;

class NodeAbortJSDOMEnvironment extends FixedJSDOMEnvironment {
  constructor(...args) {
    super(...args);
    this.global.AbortController = AbortController;
    this.global.AbortSignal = AbortSignal;
    this.global.DOMException = DOMException;
  }
}

module.exports = NodeAbortJSDOMEnvironment;
