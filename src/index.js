var merge = require('broccoli-merge-trees');
var rollupIntoTree = require('./rollup-tree');

module.exports = function(modules, indexObj) {
  var namespacedDependencies = [];
  var nonNamespacedDependencies = [];
  for (var i = 0; i < modules.length; i++) {
    var moduleName = modules[i];
    var namespaced = true;
    var name;
    if (typeof moduleName === 'string') {
      name = moduleName;
    } else {
      name = moduleName.name;
      namespaced = moduleName.namespaced;
    }

    var result = {
      fileName: name.split('/').pop() + '.js',
      moduleName: name,
    };

    if (namespaced) {
      namespacedDependencies.push(result);
    } else {
      nonNamespacedDependencies.push(result);
    }
  }

  if (namespacedDependencies.length > 0) {
    function treeForAddon(root) {
      return rollupIntoTree.call(this, root, namespacedDependencies, this._super.treeForAddon);
    }
    if (indexObj.treeForAddon) {
      indexObj.treeForAddon = function() {
        return merge([
          indexObj.treeForAddon.apply(this, arguments),
          treeForAddon.apply(this, arguments)
        ]);
      }
    } else {
      indexObj.treeForAddon = treeForAddon;
    }
  }

  if (nonNamespacedDependencies.length > 0) {
    function treeForVendor(root) {
      return rollupIntoTree.call(this, root, nonNamespacedDependencies, this._super.treeForVendor, true);
    }

    if (indexObj.treeForVendor) {
      indexObj.treeForVendor = function() {
        return merge([
          indexObj.treeForVendor.apply(this, arguments),
          treeForVendor.apply(this, arguments)
        ]);
      }
    } else {
      indexObj.treeForVendor = treeForVendor;
    }

    function included() {
      this._super.included.apply(this, arguments);

      var current = this;
      var app;

      // Keep iterating upward until we don't have a grandparent.
      // Has to do this grandparent check because at some point we hit the project.
      do {
        app = current.app || app;
      } while (current.parent.parent && (current = current.parent));

      for (var i = 0; i < nonNamespacedDependencies.length; i++) {
        app.import('vendor/' + nonNamespacedDependencies[i].fileName);
      }
    }

    if (indexObj.included) {
      var old = indexObj.included;
      indexObj.included = function() {
        // Hack to ensure _super is declared
        var _super = this._super;
        old.apply(this, arguments);
        included.apply(this, arguments);
      }
    } else {
      indexObj.included = included;
    }
  }

  return indexObj;
}
