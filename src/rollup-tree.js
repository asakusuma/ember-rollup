'use strict';
const broccoliRollUp = require('broccoli-rollup');
const merge = require('broccoli-merge-trees');
const babel = require('rollup-plugin-babel');
const stew = require('broccoli-stew');
const path = require('path');
const replace = require('broccoli-string-replace');
const relative = require('require-relative');
const Funnel = require('broccoli-funnel');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;
const resolve = require('resolve');

let es5Prefix = 'let _outputModule = (function() { let exports = {}; let module = { exports: exports };';
let es5Postfix = 'return module.exports; })();';
es5Postfix += 'exports["default"] = _outputModule';

function classifyDependencies(modules) {
  let namespacedDependencies = [];
  let nonNamespacedDependencies = [];
  for (let i = 0; i < modules.length; i++) {
    let moduleName = modules[i];
    let namespaced = true;
    let name;
    if (typeof moduleName === 'string') {
      name = moduleName;
    } else {
      name = moduleName.name;
      namespaced = moduleName.namespaced;
    }

    let result = {
      fileName: name.split('/').pop() + '.js',
      moduleName: name,
    };

    if (namespaced) {
      namespacedDependencies.push(result);
    } else {
      nonNamespacedDependencies.push(result);
    }
  }

  return {
    namespacedDependencies,
    nonNamespacedDependencies
  }
}

function shouldAddRuntimeDependencies() {
  let current = this;
  let app;

  // Keep iterating upward until we don't have a grandparent.
  // Has to do this grandparent check because at some point we hit the project.
  do {
    app = current.app || app;
  } while (current.parent.parent && (current = current.parent));

  let isTopLevelAddon = false;
  for (let i = 0; i < this.project.addons.length; i++) {
    let addon = this.project.addons[i];
    isTopLevelAddon = isTopLevelAddon || addon.name === this.name;
  }

  // If this addon isn't included directly by the app, all bets are off
  // If the addon is included directly in the app, only import dependencies
  // if this instance is the top level instance
  return !isTopLevelAddon || !this.parent.parent;
}

function rollup(runtimeDependencies, transpile, addonRoot) {
  transpile = !!transpile;
  let trees = runtimeDependencies.map(function(dep) {
    let esNext = true;
    let packagePath = resolve.sync(path.join(dep.moduleName , 'package.json'), { basedir: addonRoot });
    let pkg = relative(packagePath);
    let main = pkg['jsnext:main'];
    if (!main) {
      main = pkg.main || 'index.js';
      esNext = false;
    }

    let babelrcPath = path.dirname(main) + '/.babelrc';
    // Hacky way of getting the npm dependency folder
    let depFolder = new UnwatchedDir(path.dirname(packagePath));
    let depFolderClean = new Funnel(depFolder, {
      exclude: ['node_modules', '.git']
    });

    // Add the babelrc file
    let babelRc = new Funnel(new UnwatchedDir(__dirname + '/../'), {
      include: ['rollup.babelrc'],
      getDestinationPath: function(relativePath) {
        if (relativePath === 'rollup.babelrc') {
          return babelrcPath;
        }
        return relativePath;
      }
    });

    let preset = path.dirname(relative.resolve('babel-preset-es2015/package.json', __dirname + '/../'));
    // Windows path adjustment
    if (process.platform === 'win32') {
      preset = preset.replace(/\\/g, "\\\\");
    }
    // Add an absolute path to the es2015 preset. Needed since host app
    // won't have the preset
    let mappedBabelRc = replace(babelRc, {
      files: [ babelrcPath ],
      pattern: {
        match: /es2015/g,
        replacement: preset
      }
    });

    let moduleDir = path.dirname(dep.moduleName);
    let target;

    if (esNext) {
      target = new broccoliRollUp(merge([
        depFolderClean,
        mappedBabelRc
      ]), {
        rollup: {
          entry: main,
          targets: [{
            dest: dep.fileName,
            format: transpile ? 'amd' : 'es',
            moduleId: dep.moduleName
          }],
          plugins: [
            babel()
          ]
        }
      });
    } else {
      // If not ES6, bail out
      let wrapped = stew.map(depFolder, '*.js', function(content) {
        return [es5Prefix, content, es5Postfix].join('');
      });
      target = new Funnel(wrapped, {
        getDestinationPath: function(relativePath) {
          if (relativePath === main) {
            return dep.fileName;
          }
          return relativePath;
        }
      });
    }

    if (moduleDir === '.') {
      return target;
    } else {
      return new Funnel(target, {
        destDir: moduleDir
      });
    }
  });

  let runtimeNpmTree = merge(trees.filter(Boolean));
  return runtimeNpmTree;
}

function rollupAllTheThings(root, runtimeDependencies, superFunc, transpile) {
  if (shouldAddRuntimeDependencies.call(this)) {
    let runtimeNpmTree = rollup(runtimeDependencies, transpile, this.root);
    return superFunc.call(this, merge([runtimeNpmTree, root].filter(Boolean)));
  } else {
    return superFunc.call(this, root);
  }
}


module.exports = { rollup, classifyDependencies, rollupAllTheThings}

