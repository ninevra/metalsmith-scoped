# metalsmith-scoped

---

A [Metalsmith](https://metalsmith.io/) meta-plugin. Applies another plugin over a subset of files, based on filename glob patterns from [multimatch](https://www.npmjs.com/package/multimatch). The wrapped plugin can only see, create, and edit files matching the given patterns.

Trying to access an out-of-scope file (e.g. `files['out/of/scope/file']`) returns undefined; trying to create or modify an out-of-scope file (e.g. `files['out/of/scope/file'] = { ... }`) throws an `Error`.

### Caveats

`metalsmith-scoped` exposes a Proxy `files` object to the wrapped plugin. Due to Proxy invariants, things can get odd (out-of-scope files visible) when `files` is non-extensible or has non-configurable properties.

## Interface

`function scoped(plugin, patterns, matchOptions)`

* `plugin`: a metalsmith plugin (a function accepting arguments `files, metalsmith, callback`, expected to mutate `files` and then call `callback`)

* `patterns`: an Array of strings representing filename glob patterns, in the syntax of multimatch

* `matchOptions`: an object containing options passed through to multimatch

For CLI support, `scoped` can also be called with a one-argument signature:

`function scoped([{pluginName: pluginArgs}], patterns, matchOptions])`

* `pluginName`: a String containing the package name (or other `require`able name) of a metalsmith plugin
* `pluginArgs`: an argument to be passed to the required package

## Usage Example

### Javascript

```javascript
const scoped = require('metalsmith-scoped');
const markdown = require('metalsmith-markdown');

Metalsmith(__dirname)
  .source('src')
  .destination('build')
  .use(scoped(
    markdown(),
    ["posts/**/*.md", "index.md", "**/*.html"],
    {dot: true}
  ))
  .build((err) => {
    if (err) throw err;
  });
```

### CLI

Example `metalsmith.json`:

```json
{
  "source": "src",
  "destination": "build",
  "plugins": [
    {"metalsmith-scoped": [
      {"metalsmith-markdown": true},
      ["posts/**/*.md", "index.md", "**/*.html"],
      {"dot": true}
    ]}
  ]
}
```
