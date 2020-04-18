const multimatch = require('multimatch');

// TODO: CLI interface, plugin as string, require wrapped plugin using string

function scoped(plugin, patterns, multimatchOptions) {
  return function scopedPlugin(files, metalsmith, callback) {
    function shouldBlock(property) {
      return ((typeof property) !== 'symbol'
              && files.hasOwnProperty(property) // TODO: maybe enumerability would be a better check here?
              && multimatch(property, patterns, multimatchOptions).length === 0)
    }
    function shouldWriteBlock(property) {
      return ((typeof property) !== 'symbol'
              && multimatch(property, patterns, multimatchOptions).length === 0);
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
      },
      defineProperty: function (target, property, descriptor) {
        if (shouldWriteBlock(property)) {
          throw new Error(`${plugin.name} tried to define ${property}, out of scope ${patterns}`);
        } else {
          return Reflect.defineProperty(target, property, descriptor);
        }
      },
      set: function (target, property, value) {
        if (shouldWriteBlock(property)) {
          throw new Error(`${plugin.name} tried to set ${property}, out of scope ${patterns}`);
        } else {
          return Reflect.set(target, property, value); // TODO: add receivers here and elsewhere
        }
      },
      deleteProperty: function (target, property) {
        // TODO: should this return 'true' rather than throw?
        if (shouldWriteBlock(property)) {
          throw new Error(`${plugin.name} tried to delete ${property}, out of scope ${patterns}`);
        } else {
          return Reflect.deleteProperty(target, property);
        }
      }
    });
    plugin(filesView, metalsmith, callback);
  }
}

module.exports = scoped;
