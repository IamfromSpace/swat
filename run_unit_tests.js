const swat = require('./swat.js');
const util = require('util');
const unitTests = require('./unit_tests.js');
const { nodeReport } = require('./spec-reporter.js');

swat.run(unitTests).then(nodeReport).then(console.log).catch(console.log);
