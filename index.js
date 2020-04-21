'use strict';

const multimatch = require('multimatch');

function scoped(plugin, patterns, multimatchOptions={}) {
  if ((typeof plugin) !== 'function') {
    // Handle CLI usage
    [plugin, patterns, multimatchOptions={}] = plugin;
    const [pluginName, pluginArgs] = Object.entries(plugin)[0];
    // TODO: should we mirror metalsmith's multi-step require here?
    plugin = require(pluginName)(pluginArgs);
  }
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
    function nonConfigurable(target, property) {
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      return descriptor && !descriptor.configurable;
    }
    function getInvariant(target, property) {
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      return descriptor && descriptor.writable === false && descriptor.configurable === false;
    }
    const filesView = new Proxy(files, {
      get: function (target, property, receiver) {
        if (shouldBlock(property) && !getInvariant(target, property)) {
          return undefined;
        } else {
          return Reflect.get(target, property, receiver);
        }
      },
      ownKeys: function (target) {
        if (!Object.isExtensible(target)) {
          return Reflect.ownKeys(target);
        } else {
          return Reflect.ownKeys(target).filter(
            (key) => !shouldBlock(key) || nonConfigurable(target, key)
          );
        }
      },
      has: function (target, property) {
        if (shouldBlock(property) && Object.isExtensible(target) && !nonConfigurable(target, property)) {
          return false;
        } else {
          return Reflect.has(target, property);
        }
      },
      getOwnPropertyDescriptor: function (target, property) {
        if (shouldBlock(property) && Object.isExtensible(target) && !nonConfigurable(target, property)) {
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
