var rollup = require('broccoli-rollup');
var merge = require('broccoli-merge-trees');
var babel = require('rollup-plugin-babel');
var Funnel = require('broccoli-funnel');
var replace = require('broccoli-string-replace');
var relative = require('require-relative');
var path = require('path');

module.exports = function(modules, indexObj) {
  var runtimeDependencies = modules.map(function(moduleName) {
    return {
      fileName: moduleName.split('/').pop() + '.js',
      moduleName: moduleName
    };
  });

  function treeForVendor(name) {
    return merge(runtimeDependencies.map(function(dep) {
      var main = require(dep.moduleName + '/package.json')['jsnext:main'];
      var babelrcPath = path.dirname(main) + '/.babelrc';

      // Hacky way of getting the npm dependency folder
      var depFolder = path.dirname(require.resolve(dep.moduleName + '/package.json'));

      // Add the babelrc file
      var babelRc = new Funnel(__dirname, {
        include: ['rollup.babelrc'],
        getDestinationPath: function(relativePath) {
          if (relativePath === 'rollup.babelrc') {
            return babelrcPath;
          }
          return relativePath;
        }
      });

      var preset = path.dirname(relative.resolve('babel-preset-es2015/package.json', __dirname));

      // Add an absolute path to the es2015 preset. Needed since host app
      // won't have the preset
      var mappedBabelRc = replace(babelRc, {
        files: [ babelrcPath ],
        pattern: {
          match: /es2015/g,
          replacement: preset
        }
      });

      return new rollup(merge([
        depFolder,
        mappedBabelRc
      ]), {
        rollup: {
          entry: main,
          targets: [{
            dest: dep.fileName,
            format: 'amd',
            moduleId: dep.moduleName
          }],
          plugins: [
            babel()
          ]
        }
      });
    }));
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

    for (var i = 0; i < runtimeDependencies.length; i++) {
      app.import('vendor/' + runtimeDependencies[i].fileName);
    }
  }

  if (indexObj.included) {
    var old = indexObj.included;
    indexObj.included = function() {
      old.apply(this, arguments);
      included.apply(this, arguments);
    }
  } else {
    indexObj.included = included;
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

  return indexObj;
}
