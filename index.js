const multimatch = require('multimatch');

// TODO: CLI interface, plugin as string, require wrapped plugin using string

function scoped(plugin, patterns, multimatchOptions) {
  return function scopedPlugin(files, metalsmith, callback) {
    function shouldBlock(property) {
      return ((typeof property) !== 'symbol'
              && files.hasOwnProperty(property)
              && multimatch(property, patterns, multimatchOptions).length === 0)
    }
    const filesView = new Proxy(files, {
      get: function (target, property) {
        if (shouldBlock(property)) {
          return undefined;
        } else {
          return target[property];
        }
      },
      ownKeys: function (target) {
        return Reflect.ownKeys(target).filter(
          (key) => !shouldBlock(key)
        );
      },
      has: function (target, property) {
        if (shouldBlock(property)) {
          return false;
        } else {
          return Reflect.has(target, property);
        }
      },
      getOwnPropertyDescriptor: function (target, property) {
        if (shouldBlock(property)) {
          return undefined;
        } else {
          return Reflect.getOwnPropertyDescriptor(target, property);
        }
      }
    });
    plugin(filesView, metalsmith, callback);
  }
}

module.exports = scoped;
