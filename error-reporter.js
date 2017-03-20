const { red, grey } = require('chalk');
const { getFailedTests } = require('./swat.js');
const { inspect } = require('util');

const formatError = ({ name, error }) => `${red(name)}\n${grey(inspect(error, { depth: 20, colors: true }))}\n`;

module.exports = suite => getFailedTests(suite).map(formatError).join('\n');
