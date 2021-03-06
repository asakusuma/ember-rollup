'use strict';
const broccoliRollUp = require('broccoli-rollup');
const Merge = require('broccoli-merge-trees');
const babel = require('@rollup/plugin-babel')['default'];
const stew = require('broccoli-stew');
const path = require('path');
const replace = require('broccoli-string-replace');
const relative = require('require-relative');
const Funnel = require('broccoli-funnel');
const UnwatchedDir = require('broccoli-source').UnwatchedDir;
const resolve = require('resolve');

const es5Prefix = 'let _outputModule = (function() { let exports = {}; let module = { exports: exports };';
const es5Postfix = 'return module.exports; })(); exports["default"] = _outputModule';

function classifyDependencies(modules) {
  const namespacedDependencies = [];
  const nonNamespacedDependencies = [];
  for (let i = 0; i < modules.length; i++) {
    const moduleName = modules[i];
    let namespaced = true;
    let rollupEntry;
    let name;
    if (typeof moduleName === 'string') {
      name = moduleName;
    } else {
      name = moduleName.name;
      namespaced = moduleName.namespaced;
      rollupEntry = moduleName.rollupEntry;
    }

    const result = {
      // for scoped package, we will import '@<scoped>/<package>.js' instead of '<package>.js'
      fileName: (name.startsWith('@') ? name : name.split('/').pop()) + '.js',
      moduleName: name,
      rollupEntry: rollupEntry
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
    const addon = this.project.addons[i];
    isTopLevelAddon = isTopLevelAddon || addon.name === this.name;
  }

  // If this addon isn't included directly by the app, all bets are off
  // If the addon is included directly in the app, only import dependencies
  // if this instance is the top level instance
  return !isTopLevelAddon || !this.parent.parent;
}

function _findEntry(pkg, rollupEntry) {
  let esNext = true;
  let main = rollupEntry || pkg['jsnext:main'] || pkg['module'];
  if (!main) {
    main = pkg.main || 'index.js';
    esNext = false;
  }
  return { main, esNext };
}

function rollup(runtimeDependencies, transpile, addonRoot) {
  transpile = !!transpile;
  const trees = runtimeDependencies.map(function(dep) {
    const packagePath = resolve.sync(path.join(dep.moduleName , 'package.json'), { basedir: addonRoot });
    const pkg = relative(packagePath);
    // If rollupEntry is explicitly specified, treat as es module
    const { main, esNext } = _findEntry(pkg, dep.rollupEntry);

    const babelrcPath = path.dirname(main) + '/.babelrc';
    // Hacky way of getting the npm dependency folder
    const depFolder = new UnwatchedDir(path.dirname(packagePath));
    const depFolderClean = new Funnel(depFolder, {
      exclude: ['node_modules', '.git']
    });

    // Add the babelrc file
    const babelRc = new Funnel(new UnwatchedDir(__dirname + '/../'), {
      include: ['rollup.babelrc'],
      getDestinationPath: function(relativePath) {
        if (relativePath === 'rollup.babelrc') {
          return babelrcPath;
        }
        return relativePath;
      }
    });

    let preset = path.dirname(relative.resolve('@babel/preset-env/package.json', __dirname + '/../'));
    // Windows path adjustment
    if (process.platform === 'win32') {
      preset = preset.replace(/\\/g, '\\\\');
    }
    // Add an absolute path to the es2015 preset. Needed since host app
    // won't have the preset
    const mappedBabelRc = replace(babelRc, {
      files: [ babelrcPath ],
      pattern: {
        match: /es2015/g,
        replacement: preset
      }
    });

    let target;

    if (esNext) {
      const amd = transpile ? { id: dep.moduleName } : null;
      target = new broccoliRollUp(new Merge([
        depFolderClean,
        mappedBabelRc
      ], { annotation: '[ember-rollup] Merge in BabelRC file' }), {
        rollup: {
          input: main,
          output: {
            file: dep.fileName,
            format: transpile ? 'amd' : 'es',
            name: dep.moduleName,
            amd
          },
          plugins: [
            babel()
          ]
        }
      });
    } else {
      // If not ES6, bail out
      const wrapped = stew.map(depFolder, '*.js', function(content) {
        return [es5Prefix, content, es5Postfix].join('');
      });
      target = new Funnel(wrapped, {
        include: ['**/*.js'],
        getDestinationPath: function(relativePath) {
          if (relativePath === main) {
            return dep.fileName;
          }
          return relativePath;
        }
      });
    }

    const moduleDir = path.dirname(dep.moduleName);

    if (moduleDir === '.' || moduleDir.startsWith('@')) {
      return target;
    } else {
      return new Funnel(target, {
        destDir: moduleDir
      });
    }
  });

  const runtimeNpmTree = new Merge(trees.filter(Boolean), { annotation: '[ember-rollup] Merge runtime module trees' });
  return runtimeNpmTree;
}

function rollupAllTheThings(root, runtimeDependencies, superFunc, transpile, superAnnotation) {
  if (shouldAddRuntimeDependencies.call(this)) {
    const annotation = `[ember-rollup] Merge runtime dependency tree and ${superAnnotation || ' unknown treeFor hook'}`;
    const runtimeNpmTree = rollup(runtimeDependencies, transpile, this.root);
    return superFunc.call(this, new Merge([runtimeNpmTree, root].filter(Boolean), { annotation }));
  } else {
    return superFunc.call(this, root);
  }
}


module.exports = { rollup, classifyDependencies, rollupAllTheThings, _findEntry }

