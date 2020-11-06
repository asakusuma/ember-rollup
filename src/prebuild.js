'use strict';
const fs = require('fs-extra');
const builder = require('broccoli-builder');
const Addon = require('ember-cli/lib/models/addon');
const Project = require('ember-cli/lib/models/project');
const UI = require('console-ui');
const Merge = require('broccoli-merge-trees');
const Funnel = require('broccoli-funnel');

// Pre-build the dependency of an addon and store it in prebuilt path by invoking the treeForAddon and treeForVendor hook
function preBuild(addonPath) {
  // Require the addon
  let addonToBuild = require(addonPath);
  // Augment it with isDevelopingAddon function.
  addonToBuild.isDevelopingAddon = function() {
    return true;
  }
  // If addon has pre-built path set in it use that else use the default path
  if(!addonToBuild.PREBUILT_PATH) {
    addonToBuild.PREBUILT_PATH = `${addonPath}/pre-built`;
  }
  fs.removeSync(addonToBuild.PREBUILT_PATH);

  const ui = new UI({
    inputStream: process.stdin,
    outputStream: process.stdout,
    errorStream: process.stderr,
    writeLevel: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR',
    ci: true | false
  });
  const project = Project.closestSync(addonPath, ui);
  project.initializeAddons();
  // Extend the current addon from base Addon
  const CurrentAddon = Addon.extend(Object.assign({}, addonToBuild, {root: addonPath, pkg: project.pkg}));
  const currAddon  = new CurrentAddon(addonPath, project);

  // Get the tree for Addon and Vendor
  let addonTree = new Funnel (currAddon.treeFor('addon'), {
    destDir:  'addon'
  });

  let vendorTree = new Funnel (currAddon.treeFor('vendor'), {
    destDir:  'vendor'
  });

  // Merge, Build the resulting tree and store it in prebuild path
  return build(new Merge([addonTree, vendorTree], { annotation: '[ember-rollup] Merging prebuild addon and vendor tree' }), addonToBuild.PREBUILT_PATH).finally(() => {
    console.log('SWAG PAUSED');
    process.stdin.pause();
  });
 }

function build(tree, prebuiltPath) {
  if(tree) {
    return new builder.Builder(tree).build().then(result => {
      fs.copySync(result.directory, prebuiltPath, { dereference: true });
    });
  }
  return Promise.resolve();
}

module.exports = {preBuild, build };

