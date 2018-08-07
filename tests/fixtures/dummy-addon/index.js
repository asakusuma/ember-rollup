/* eslint node: true */
const emberRollup = require('../../../src/index');
const PREBUILT_PATH = `${__dirname}/pre-built`;
const fs = require('fs');
const rollupModule =  fs.readFileSync(`${__dirname}/rollup-module`, 'utf8');
const writeFile = require('broccoli-file-creator');
var BroccoliMergeTrees = require('broccoli-merge-trees');

module.exports =  emberRollup([rollupModule], {
    PREBUILT_PATH,
    name: 'dummy-addon',
    treeForAddon() {
        const tree = this._super.treeForAddon.apply(this, arguments);
        const newFile = writeFile('/from-tree-for-addon.js', 'console.log("from treeForAddon");');
        return new BroccoliMergeTrees([tree, newFile].filter(Boolean));
    },
    treeForVendor() {
        const tree = this._super.treeForVendor.apply(this, arguments);
        const newFile = writeFile('/from-tree-for-vendor.js', 'console.log("from treeFromVendor");');
        return new BroccoliMergeTrees([tree, newFile].filter(Boolean));
    }
});
