# ember-rollup Changelog

### 1.1.0 (August 7, 2018)

  - Play nice with existing `treeForAddon` and `treeForVendor` hook usage.

### 1.0.0 (Feb 8, 2018)

- Support "prebuilding" dependencies when publishing, so host apps don't have to build rollup dependencies on every build.

### 0.3.0 (November 10, 2016)

  - Support choosing whether or not to namespace module names.

### 0.2.0 (October 14, 2016)

  - Support npm namespaces like `import myModule from 'my-addon/@my-namespace/my-module'`.


### 0.1.0 (October 12, 2016)

  - Namespace module names to the addon. `import RSVP from 'rsvp'` becomes `import RSVP from 'my-addon/rsvp'`.
