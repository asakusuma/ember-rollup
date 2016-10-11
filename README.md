# ember-rollup
Use rollup to add runtime dependencies to an ember-cli build.

### What is this thing?

`ember-rollup` is not an addon, but rather a function that takes just two arguments:

* An array of string module names. These modules must be present in `dependencies` in `package.json`. Modules must define a `jsnext:main` property.
* The original object to be exported in `index.js`

Simply wrap the exports of your app/addon `index.js` with the function, and suddenly, ES6/2015 dependencies in your ember app! `ember-rollup` even handles [babel](http://babeljs.io/) for you.

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
import myModule from 'my-module';
import RSVP from 'rsvp';
```
