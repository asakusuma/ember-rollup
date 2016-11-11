# ember-rollup
Use rollup to add runtime dependencies to an ember-cli addon.

### What is this thing?

`ember-rollup` is not an addon, but rather a function that takes just two arguments:

* An array of string module names. These modules must be present in `dependencies` in `package.json`. Modules must define a `jsnext:main` or `main` property.
* The original object to be exported in `index.js`

Simply wrap the exports of your app/addon `index.js` with the function, and suddenly, ES6/2015 dependencies in your ember app! `ember-rollup` even handles [babel](http://babeljs.io/) for you. Modules are namespaced based on the addon name.

If no `jsnext:main` is provided, `ember-rollup` will fallback to `main` and assume a normal CommonJS module.

### Example

```JavaScript
//my-addon/index.js
var emberRollup = require('ember-rollup');
var runtimeDependencies = ['my-module', 'rsvp'];

module.exports = emberRollup(runtimeDependencies, {
  name: 'my-addon',
  ...
}
```

```JavaScript
//my-addon/app/my-thing.js
import myModule from 'my-addon/my-module';
import RSVP from 'my-addon/rsvp';
```

### Turning off addon namespacing

By default, module names are namespaced based on the addon. The reason being, an app might use two different addons that require two different versions of the same module. If you would rather force the app to only include one version of any given module, you can turn off namespacing.

```JavaScript
//my-addon/index.js
var emberRollup = require('ember-rollup');
var runtimeDependencies = [{
  name: 'my-module',
  namespaced: false
}, 'rsvp'];

module.exports = emberRollup(runtimeDependencies, {
  name: 'my-addon',
  ...
}
```

```JavaScript
//my-addon/app/my-thing.js
import myModule from 'my-module';
import RSVP from 'my-addon/rsvp';
```
