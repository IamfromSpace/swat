const swat = require('./swat.js');
const util = require('util');
const unitTests = require('./unit_tests.js');

swat.run(unitTests).then(r => util.inspect(r, {depth: 100, colors: true})).then(console.log).catch(console.log);
