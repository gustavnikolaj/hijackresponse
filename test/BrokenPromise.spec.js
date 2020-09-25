const expect = require("unexpected");
const BrokenPromise = require("../lib/BrokenPromise");

describe("BrokenPromise", () => {
  it("should return a thenable", () => {
    const brokenPromise = new BrokenPromise();

    expect(brokenPromise, "to satisfy", {
      then: expect.it("to be a function")
    });
  });

  it("should make _resolve available immediately", () => {
    // This verifies that the promise constructor callback is called synchronously.
    const brokenPromise = new BrokenPromise();
    brokenPromise.resolve("yay");

    return expect(brokenPromise, "to be fulfilled with", "yay");
  });

  it("should make _reject available immediately", () => {
    // This verifies that the promise constructor callback is called synchronously.
    const brokenPromise = new BrokenPromise();
    brokenPromise.reject("nay");

    return expect(brokenPromise, "to be rejected with", "nay");
  });

  it("should resolve like a promise", () => {
    const brokenPromise = new BrokenPromise();

    setImmediate(() => brokenPromise.resolve("deferredValue"));

    return expect(brokenPromise, "to be fulfilled with", "deferredValue");
  });

  it("should support chaining", () => {
    const brokenPromise = new BrokenPromise();
    const resultPromise = brokenPromise
      .then(value => "foo" + value)
      .then(value => value + "!");

    brokenPromise.resolve("bar");

    return expect(resultPromise, "to be fulfilled with", "foobar!");
  });

  it("should catch errors", () => {
    const brokenPromise = new BrokenPromise();
    const resultPromise = brokenPromise.catch(err => "caught!");

    brokenPromise.reject(new Error());

    return expect(resultPromise, "to be fulfilled with", "caught!");
  });

  it("should catch errors using then", () => {
    const brokenPromise = new BrokenPromise();
    const resultPromise = brokenPromise.then(
      () => {},
      err => "caught!"
    );

    brokenPromise.reject(new Error());

    return expect(resultPromise, "to be fulfilled with", "caught!");
  });
});
