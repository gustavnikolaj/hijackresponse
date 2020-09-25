// writable streams also have a destroy method, but we don't want to override
// that.
const writableProperties = [
  "cork",
  "end",
  "setDefaultEncoding",
  "uncork",
  "writable",
  "writableEnded",
  "writableCorked",
  "writableFinished",
  "writableHighWaterMark",
  "writableLength",
  "writableObjectMode",
  "write"
];

module.exports = function transformAsReadable(transformStream) {
  // Trap properties that only exist on a writeable stream.

  return new Proxy(transformStream, {
    get(target, prop, receiver) {
      if (!writableProperties.includes(prop)) {
        return Reflect.get(...arguments);
      }
    }
  });
};
