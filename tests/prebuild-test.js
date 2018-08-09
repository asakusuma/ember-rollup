'use strict';

const expect = require('chai').expect;
const prebuildRollUp = require('../src/prebuild');
const fs = require('fs-extra');
const Funnel = require('broccoli-funnel');
const fixturify = require('fixturify');
const path = require('path');
const preBuildPath = `${__dirname}/fixtures/dummy-addon/pre-built`;
const FIXTURE_INPUT = `${__dirname}/fixtures/dir`;
const rollupModule = `${__dirname}/fixtures/dummy-addon/rollup-module`;
const addonPath = `${__dirname}/fixtures/dummy-addon`;

describe('prebuild', function() {
  afterEach(function() {
    fs.removeSync(preBuildPath);
    fs.removeSync(path.join(path.dirname(`${__dirname}`), '/tmp'));
    const addon = require.resolve(addonPath);
    delete require.cache[addon];
  });

  it('build dependency if it is present in node_modules', function() {
    this.timeout(7000);
    fs.writeFileSync(rollupModule, 'ember-inner-addon', 'utf8');
    const result = prebuildRollUp.preBuild(addonPath);
    return result.then(() => {
      expect(fs.readdirSync(preBuildPath)).to.deep.equal(['addon','vendor']);
      expect(fs.existsSync(`${preBuildPath}/addon/from-tree-for-addon.js`), 'Host addon treeForAddon still works').to.be.ok;
      expect(fs.existsSync(`${preBuildPath}/vendor/from-tree-for-vendor.js`), 'Host addon treeForVendor still works').to.be.ok;
      const stats = fs.lstatSync(path.join(preBuildPath,'addon'));
      expect(stats.isSymbolicLink()).to.be.false;
    });
  });

  it('throws an error when the dependency is not in node modules', function() {
    fs.writeFileSync(rollupModule, 'ember-data', 'utf8');
    expect(function() {
      prebuildRollUp.preBuild(addonPath)
    }).to.throw(/Cannot find module \'ember-data\/package\.json\'/);
  });
});

describe('build', function() {
  beforeEach(function(){
    fs.mkdirpSync(FIXTURE_INPUT);
    fixturify.writeSync(FIXTURE_INPUT, {
      dir1: {
        subdir1: {
          'foo.js': ''
        },
        subdir2: {
          'bar.css': ''
        },
        'root-file.txt': ''
        }
    });
  });

  afterEach(function() {
    fs.removeSync(FIXTURE_INPUT);
    fs.removeSync(path.join(path.dirname(`${__dirname}`), '/tmp'));
  });

  it('stores the output in the given path', function() {
    const tree = new Funnel(FIXTURE_INPUT + '/dir1', {
      include: ['**/*.js']
    });
    const preBuildPath = path.join(FIXTURE_INPUT, 'pre-built')
    expect(function() {
      fs.readdirSync(preBuildPath);
    }).to.throw(/ENOENT.*pre-built/);

    return prebuildRollUp.build(tree, preBuildPath).then(() => {
      expect(fs.readdirSync(preBuildPath)).to.deep.equal(['subdir1']);
    });
  });

  it('throws if tree is null', function() {
    const tree = null;
    expect(function() {
      prebuildRollUp.build(tree, preBuildPath);
    }, /TypeError: Cannot read property \'rebuild\' of null/);
  });
});

