'use strict';

const expect = require('chai').expect;
const rollupTree = require('../src/rollup-tree');
const path = require('path');
const helpers = require('broccoli-test-helper');
const createBuilder = helpers.createBuilder;
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

    describe('rollup', function() {
        let output;
        const addonPath = path.dirname(`${__dirname}`);
        afterEach(co.wrap(function* () {
            yield output.dispose();
        }));

        it('rolls up a single module', co.wrap(function* () {
            let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "spaniel.js": "create"
            });
            this.timeout(7000);
        }));

        it('rolls up a single module, using "module" package.json value', co.wrap(function* () {
            let dependencies = [{
                fileName: 'rsvp.js',
                moduleName: 'rsvp'
            }];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "rsvp.js": "create"
            });
            this.timeout(7000);
        }));

        it('rolls up multiple modules', co.wrap(function* () {
            let dependencies = [{ fileName: 'spaniel.js', moduleName: 'spaniel' }, { fileName: 'require-relative.js', moduleName: 'require-relative'}];
            let node = rollupTree.rollup(dependencies, undefined, addonPath);
            output = createBuilder(node);
            yield output.build();
            expect(output.changes()).to.deep.equal({
                "README.md": "create",
                "package.json": "create",
                "require-relative.js": "create",
                "spaniel.js": "create"
            });
            this.timeout(9000);
        }));
    });
});