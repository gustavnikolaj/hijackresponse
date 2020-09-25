/**
 * A promise, except that the resolve and reject methods are exposed.
 */

class BrokenPromise {
  constructor() {
    this._resolve = null;
    this._reject = null;

    this.internalPromise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  resolve(value) {
    this._resolve(value);
    return this.internalPromise;
  }

  reject(err) {
    this._reject(err);
    return this.internalPromise;
  }

  get then() {
    return this.internalPromise.then.bind(this.internalPromise);
  }

  get catch() {
    return this.internalPromise.catch.bind(this.internalPromise);
  }
}

module.exports = BrokenPromise;
