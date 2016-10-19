const swat = require('./swat.js');
const browserTimer = {
  before: performance.now.bind(performance),
  after: (result, time) => Object.assign({}, result, { time: performance.now() - time }),
  name: 'browser timer',
};
const run = swat.runCreator([browserTimer])

const processSuite = result => previousSuiteNames => ({ name, tests, suites }) => {
  const currentSuiteNames = name ? previousSuiteNames.concat([name]) : previousSuiteNames;
  tests.forEach(test => test.result === swat.PASS
    ? result(toKarmaSuccess(test, currentSuiteNames))
    : result(toKarmaError(test, currentSuiteNames))
  );
  suites.forEach(processSuite(result)(currentSuiteNames));
};

const toKarmaSuccess = ({ test, name, time }, suite) => ({
  suite,
  id: name,
  description: name,
  log: [],
  success: true,
  skipped: false,
  time,
});

const toKarmaError = ({ test, name, error, time }, suite) => ({
  suite,
  id: name,
  description: name,
  log: [error.hasOwnProperty('message') ? error.message : error],
  success: false,
  skipped: false,
  time,
});

const _countTests = (count, { tests, suites }) =>
  suites.reduce(_countTests, count + tests.length)
;
const countTests = suite => _countTests(0, suite);

const createStart = rootSuite => ({ info, result, complete, error }) => {
  info('starting');
  run(rootSuite)
    .then(rootSuiteResult => {
      info({ total: countTests(rootSuiteResult) });
      processSuite(result)([])(rootSuiteResult);
      complete();
    })
    .catch(error)
  ;
};

const runKarma = rootSuite => w => {
  w.__karma__.start = () => createStart(rootSuite)(w.__karma__);
};

const rootSuite = require('./unit_tests');
runKarma(rootSuite)(window);
