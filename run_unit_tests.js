const swat = require('./swat.js');
const util = require('util');
const unitTests = require('./unit_tests.js');
const nodeReporter = require('./node-reporter.js');

swat.run(unitTests).then(nodeReporter).then(console.log).catch(console.log);
