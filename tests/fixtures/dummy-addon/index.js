/* eslint node: true */
const emberRollup = require('../../../src/index');
const PREBUILT_PATH = `${__dirname}/pre-built`;
const fs = require('fs');
const rollupModule =  fs.readFileSync(`${__dirname}/rollup-module`, 'utf8');

module.exports =  emberRollup([rollupModule], {
    PREBUILT_PATH,
    name: 'dummy-addon',
});
