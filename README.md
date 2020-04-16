# metalsmith-scoped

A Metalsmith meta-plugin. Applies another plugin over a subset of files, based on filename patterns from multimatch.

Useful when a plugin has no filename-matching options.

## Interface

```javascript
function scoped(plugins, patterns, multimatchOptions) {};
```

## Usage

### Javascript

```javascript

const scoped = require('metalsmith-scoped');

Metalsmith(__dirname)
  // ... plugins, etc ...
  .use(scoped(otherPlugin(options), ["/mypattern/**/*", "my/other/pattern.md"]))
  // ... plugins, etc ...
```

### CLI

TODO
