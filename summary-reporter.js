const { green, red, bold, grey } = require('chalk');
const { getFailedTests, countTests } = require('./swat.js');

const formatSummary = (total, fails) => {
  const passes = total - fails;
  const passed = fails === 0;
  return passed
    ? `  ${grey('SWAT:')} ${bold(green('SUCCESS'))} (${green(passes)} of ${total} tests passed).`
    : `  ${grey('SWAT:')} ${bold(red('FAILURE'))} (${red(fails)} of ${total} tests failed).`
  ;
};

module.exports = suite => formatSummary(countTests(suite), getFailedTests(suite).length);
