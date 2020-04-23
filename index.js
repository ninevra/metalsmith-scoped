'use strict';

const multimatch = require('multimatch');

function hasOwnPropertyMatching(target, property, spec, invert=false) {
  const descriptor = Object.getOwnPropertyDescriptor(target, property);
  if (!descriptor) return false;
  for (let [key, value] of Object.entries(spec)) {
    if (descriptor[key] !== value) return invert;
  }
  return !invert;
}

function scoped(plugin, patterns, multimatchOptions={}) {
  if ((typeof plugin) !== 'function') {
    // Handle CLI usage
    [plugin, patterns, multimatchOptions={}] = plugin;
    const [pluginName, pluginArgs] = Object.entries(plugin)[0];
    // TODO: should we mirror metalsmith's multi-step require here?
    plugin = require(pluginName)(pluginArgs);
  }
  return function scopedPlugin(files, metalsmith, callback) {
    function matches(property) {
      return ((typeof property) !== 'symbol'
              && multimatch(property, patterns, multimatchOptions).length === 0);
    }
    const filesView = new Proxy(files, {
      get: function (target, property, receiver) {
        if (matches(property) && hasOwnPropertyMatching(target, property, {writable: false, configurable: false}, true)) {
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
            (key) => !matches(key) || hasOwnPropertyMatching(target, key, {configurable: false})
          );
        }
      },
      has: function (target, property) {
        if (matches(property) && Object.isExtensible(target)
            && hasOwnPropertyMatching(target, property, {configurable: false}, true)) {
          return false;
        } else {
          return Reflect.has(target, property);
        }
      },
      getOwnPropertyDescriptor: function (target, property) {
        if (matches(property) && Object.isExtensible(target)
            && hasOwnPropertyMatching(target, property, {configurable: false}, true)) {
          return undefined;
        } else {
          return Reflect.getOwnPropertyDescriptor(target, property);
        }
      },
      defineProperty: function (target, property, descriptor) {
        if (matches(property)) {
          throw new Error(`${plugin.name} tried to define ${property}, out of scope ${patterns}`);
        } else {
          return Reflect.defineProperty(target, property, descriptor);
        }
      },
      set: function (target, property, value, receiver) {
        if (matches(property)) {
          throw new Error(`${plugin.name} tried to set ${property}, out of scope ${patterns}`);
        } else {
          return Reflect.set(target, property, value, receiver);
        }
      },
      deleteProperty: function (target, property) {
        // TODO: should this return 'true' rather than throw?
        if (matches(property)) {
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
