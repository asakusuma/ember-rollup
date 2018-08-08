'use strict';
const merge = require('broccoli-merge-trees');
const rollupIntoTree = require('./rollup-tree').rollupAllTheThings;
const path = require('path');
const fs = require('fs-extra');
const ADDON = "addon";
const VENDOR = "vendor";

// Verify if dependency module is prebuilt already
function isPreBuilt(indexObj, preBuiltPath) {
  if (!(indexObj.isDevelopingAddon && indexObj.isDevelopingAddon()) && fs.existsSync(preBuiltPath)) {
    return true;
  }
  return false;
}

// Get prebuilt path from the addon if it is present else return the default path
function getPreBuiltPath(indexObj) {
  if(!indexObj.PREBUILT_PATH) {
    return `${this.root}/pre-built`;
  }
  return indexObj.PREBUILT_PATH;
}

module.exports = function(modules, indexObj) {
  const classifyDependencies = require('./rollup-tree').classifyDependencies;
  const dependencies = classifyDependencies(modules);

  if (dependencies.namespacedDependencies.length > 0) {
    function treeForAddon(root) {
      const preBuiltPath = getPreBuiltPath.call(this, indexObj);
      // Verify if dependency module is prebuilt already, if yes return the prebuilt path
      if(isPreBuilt(indexObj, path.join(preBuiltPath, ADDON))) {
        return path.join(preBuiltPath, ADDON);
      }
      // else rollup
      return rollupIntoTree.call(this, root, dependencies.namespacedDependencies, this._super.treeForAddon);
    }
    if (indexObj.treeForAddon) {
      const originalTreeForAddon = indexObj.treeForAddon;
      indexObj.treeForAddon = function() {
        // Must reference this._super for super to be available inside the treeForAddon functions
        const __super = this._super;
        return merge([
          originalTreeForAddon.apply(this, arguments),

          // If a treeForAddon has already been implemented, assume it merges the super tree
          // so we don't need to pass in the original tree a second time, hence no parameters
          treeForAddon.apply(this)
        ]);
      }
    } else {
      indexObj.treeForAddon = treeForAddon;
    }
  }

  if (dependencies.nonNamespacedDependencies.length > 0) {
    function treeForVendor(root) {
      const preBuiltPath = getPreBuiltPath.call(this, indexObj);
      if(isPreBuilt(indexObj, path.join(preBuiltPath, VENDOR))) {
        return path.join(preBuiltPath, VENDOR);
      }
      // else rollup
      return rollupIntoTree.call(this, root, dependencies.nonNamespacedDependencies, this._super.treeForVendor, true);
    }

    if (indexObj.treeForVendor) {
      indexObj.treeForVendor = function() {
        // Must reference this._super for super to be available inside the treeForVendor functions
      const __super = this._super;
      const originalTreeForVendor = indexObj.treeForVendor;
        return merge([
          originalTreeForVendor.apply(this, arguments),

          // If a treeForVendor has already been implemented, assume it merges the super tree
          // so we don't need to pass in the original tree a second time, hence no parameters
          treeForVendor.apply(this)
        ]);
      }
    } else {
      indexObj.treeForVendor = treeForVendor;
    }

    function included() {
      this._super.included.apply(this, arguments);

      let current = this;
      let app;

      // Keep iterating upward until we don't have a grandparent.
      // Has to do this grandparent check because at some point we hit the project.
      do {
        app = current.app || app;
      } while (current.parent.parent && (current = current.parent));

      for (let i = 0; i < dependencies.nonNamespacedDependencies.length; i++) {
        app.import('vendor/' + dependencies.nonNamespacedDependencies[i].fileName);
      }
    }

    if (indexObj.included) {
      const old = indexObj.included;
      indexObj.included = function() {
        // Hack to ensure _super is declared
        let _super = this._super;
        old.apply(this, arguments);
        included.apply(this, arguments);
      }
    } else {
      indexObj.included = included;
    }
  }
  return indexObj;
}
