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
  let dependencies = classifyDependencies(modules);

  if (dependencies.namespacedDependencies.length > 0) {
    function treeForAddon(root) {
      let preBuiltPath = getPreBuiltPath.call(this, indexObj);
      // Verify if dependency module is prebuilt already, if yes return the prebuilt path
      if(isPreBuilt(indexObj, path.join(preBuiltPath, ADDON))) {
        return path.join(preBuiltPath, ADDON);
      }
      // else rollup
      return rollupIntoTree.call(this, root, dependencies.namespacedDependencies, this._super.treeForAddon);
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

  if (dependencies.nonNamespacedDependencies.length > 0) {
    function treeForVendor(root) {
      let preBuiltPath = getPreBuiltPath.call(this, indexObj);
      if(isPreBuilt(indexObj, path.join(preBuiltPath, VENDOR))) {
        return path.join(preBuiltPath, VENDOR);
      }
      // else rollup
      return rollupIntoTree.call(this, root, dependencies.nonNamespacedDependencies, this._super.treeForVendor, true);
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
      let old = indexObj.included;
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
