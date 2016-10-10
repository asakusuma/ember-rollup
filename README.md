# ember-rollup
Use rollup to add runtime dependencies to an ember-cli build

Ember-rollup exposes a function that takes just two arguments:

* An array of string module names. These modules must be present in `dependencies` in `package.json`. Modules must define a `jsnext:main` property.
* The original object to be exported in `index.js`

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
