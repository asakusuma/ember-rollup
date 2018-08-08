'use strict';

const expect = require('chai').expect;
const rollupTree = require('../src/rollup-tree');
const path = require('path');
const helpers = require('broccoli-test-helper');
const createBuilder = helpers.createBuilder;
const createTempDir = helpers.createTempDir;
const co = require('co');

describe('rollup-tree', function() {
  describe('classifyDependencies', function() {
    it('classifies nonNamespacedDependencies', function() {
      let dependencies = rollupTree.classifyDependencies([{name: 'broccoli-stew',  namespaced: false }]);
      expect(dependencies.namespacedDependencies).to.deep.equal([]);
      expect(dependencies.nonNamespacedDependencies).to.deep.equal([{ fileName: 'broccoli-stew.js', moduleName: 'broccoli-stew' } ]);
    });

    it('classifies namespacedDependencies', function() {
      let dependencies = rollupTree.classifyDependencies([{name: 'broccoli-stew',  namespaced: true, }]);
      expect(dependencies.namespacedDependencies).to.deep.equal([{ fileName: 'broccoli-stew.js', moduleName: 'broccoli-stew' } ]);
      expect(dependencies.nonNamespacedDependencies).to.deep.equal([]);
    });

    it('by default classifies dependency array of object to nonNamespacedDependencies ', function() {
      let dependencies = rollupTree.classifyDependencies([{name: 'broccoli-stew' }]);
      expect(dependencies.namespacedDependencies).to.deep.equal([]);
      expect(dependencies.nonNamespacedDependencies).to.deep.equal([{ fileName: 'broccoli-stew.js', moduleName: 'broccoli-stew' } ]);
    });

    it('by default classifies dependency array of string to namespacedDependencies ', function() {
      let dependencies = rollupTree.classifyDependencies(['broccoli-stew']);
      expect(dependencies.namespacedDependencies).to.deep.equal([{ fileName: 'broccoli-stew.js', moduleName: 'broccoli-stew' } ]);
      expect(dependencies.nonNamespacedDependencies).to.deep.equal([]);
    });

    it('does not throw for empty dependency array', function() {
      let dependencies = rollupTree.classifyDependencies([]);
      expect(dependencies.namespacedDependencies).to.deep.equal([]);
      expect(dependencies.nonNamespacedDependencies).to.deep.equal([]);
    });
  });

  describe('rollupAllTheThings', function() {
    let output;
    const addonPath = path.dirname(`${__dirname}`);
    afterEach(co.wrap(function* () {
      yield output.dispose();
    }));

    it('combines rollup dependencies with tree from super when top addon', co.wrap(function* () {
      const root = yield createTempDir();
      root.write({
        'myRootFile.js': '// myRootFile.js'
      });
      const addon = {
        root: addonPath,
        parent: {},
        project: {
          addons: [{
            name: 'my-addon'
          }]
        }
      };
      let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }];
      const superFunc = (tree) => tree;

      let node = rollupTree.rollupAllTheThings.call(addon, root.path(), dependencies, superFunc);
      output = createBuilder(node);
      yield output.build();
      expect(output.changes()).to.deep.equal({
        "myRootFile.js": "create",
        "spaniel.js": "create"
      });
      this.timeout(10000);
    }));

    it('does not include rollup deps and just returns root tree via super when addon is not the top addon', co.wrap(function* () {
      const root = yield createTempDir();
      root.write({
        'myRootFile.js': '// myRootFile.js'
      });
      const addon = {
        root: addonPath,
        name: 'my-addon',
        parent: {
          parent: {}
        },
        project: {
          addons: [{
            name: 'my-addon'
          }]
        }
      };
      let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }];
      const superFunc = (tree) => tree;

      let node = rollupTree.rollupAllTheThings.call(addon, root.path(), dependencies, superFunc);
      output = createBuilder(node);
      yield output.build();
      expect(output.readDir()).to.deep.equal([
        "myRootFile.js"
      ]);
      this.timeout(10000);
    }));
  });
    describe('rollup', function() {
        let output;
        const addonPath = path.dirname(`${__dirname}`);
        afterEach(co.wrap(function* () {
            this.timeout(10000);
            yield output.dispose();
        }));

        it('rolls up a single module', co.wrap(function* () {
            this.timeout(7000);
            let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "spaniel.js": "create"
            });
        }));

        it('rolls up a single module with rollupEntry', co.wrap(function* () {
            this.timeout(7000);
            let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel', rollupEntry: 'exports/spaniel.js' }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "spaniel.js": "create"
            });
        }));

        it('rolls up multiple modules', co.wrap(function* () {
            this.timeout(9000);
            let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }, { fileName: 'require-relative.js', moduleName: 'require-relative'}];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "require-relative.js": "create",
                "spaniel.js": "create"
            });
        }));

        it('rolls up a scoped module', co.wrap(function* () {
            this.timeout(2000);
            let dependencies = [{ fileName: '@xg-wang/whatwg-fetch.js', moduleName: '@xg-wang/whatwg-fetch' }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "@xg-wang/": "mkdir",
                "@xg-wang/whatwg-fetch.js": "create"
            });
        }));

        it('rolls up a scoped module with rollupEntry', co.wrap(function* () {
            this.timeout(2000);
            let dependencies = [{ fileName: '@xg-wang/whatwg-fetch.js', moduleName: '@xg-wang/whatwg-fetch', rollupEntry: './fetch.js' }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "@xg-wang/": "mkdir",
                "@xg-wang/whatwg-fetch.js": "create"
            });
        }));
    });

    describe('_findEntry', function() {
        it('esNext set to false if module entry not found', function() {
            const pkg = {
                main: 'index.js'
            };
            const found = rollupTree._findEntry(pkg);
            expect(found).to.deep.equal({main: 'index.js', esNext: false});
        });

        it('prioritize rollupEntry if passed in', function() {
            const pkg = {
                main: 'index.js'
            };
            const found = rollupTree._findEntry(pkg, 'rollupEntry.js');
            expect(found).to.deep.equal({main: 'rollupEntry.js', esNext: true});
        })
    })
});