/**
 * jsdom with Node's own fetch primitives, made to agree with jsdom's DOM.
 *
 * jest-fixed-jsdom already exposes Node's fetch, Request, Response and
 * FormData. Two gaps remain, both because a Node class meets a jsdom object:
 *
 * - AbortController, AbortSignal and DOMException still come from jsdom, and
 *   Node's fetch rejects a signal from another realm, so every request that
 *   carries one (RTK Query always does) fails as if the network were down.
 *   Node's versions are exposed instead.
 * - Node's FormData cannot read a jsdom <form>, and React builds one from the
 *   form on every submit. FormData is extended to read the form's fields, as
 *   a browser's does.
 */
const jestFixedJsdom = require('jest-fixed-jsdom');
const FixedJSDOMEnvironment = jestFixedJsdom.default ?? jestFixedJsdom;

class NodeAbortJSDOMEnvironment extends FixedJSDOMEnvironment {
  constructor(...args) {
    super(...args);
    this.global.AbortController = AbortController;
    this.global.AbortSignal = AbortSignal;
    this.global.DOMException = DOMException;

    const NodeFormData = this.global.FormData;
    const JsdomForm = this.global.HTMLFormElement;

    this.global.FormData = class FormDataFromForm extends NodeFormData {
      constructor(form, submitter) {
        super();
        if (!(form instanceof JsdomForm)) return;

        for (const field of form.elements) {
          const skipped =
            field.name === '' ||
            field.disabled ||
            (['checkbox', 'radio'].includes(field.type) && !field.checked) ||
            (['submit', 'button', 'reset'].includes(field.type) && field !== submitter);
          if (!skipped) this.append(field.name, field.value);
        }
      }
    };
  }
}

module.exports = NodeAbortJSDOMEnvironment;
