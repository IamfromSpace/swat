const { specReporter } = require('./spec-reporter.js');
const errorReporter = require('./error-reporter.js');
const summaryReporter = require('./summary-reporter.js');

module.exports = (r) => specReporter(r) + '\n\n' + errorReporter(r) + '\n' + summaryReporter(r);
