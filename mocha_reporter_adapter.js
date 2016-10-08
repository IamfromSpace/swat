const makeRunnerAdapter = runner => ({
  on: (eventName, fn) => { runner[eventName] = runner[eventName] ? runner[eventName].concat([fn]) : [fn] },
})

const giveToReporter = reporter => suite => {
  const context = { epilogue: reporter.prototype.epilogue };
  const runner = {};
  const runnerAdapter = makeRunnerAdapter(runner);
  reporter.bind(context)(runnerAdapter);
  giveToRunner(runner)(suite);
  //reporter.prototype.epilogue.bind(context)();
}

const giveToRunner = runner => (suite, root = true) => {
  runner.start.forEach(fn => fn());
  Object.keys(suite).reduce(
    (_, key) => {
      if (typeof suite[key].result === 'undefined') {
        runner.suite.forEach(fn => fn({ root, title: key }));
        giveToRunner(suite[key], false);
      } else if (suite[key].result === 'fail') {
        runner.fail.forEach(fn => fn(Object.assign({}, suite[key], { title: key, fullTitle: () => key }), { message: suite[key].error }))
        runner['test end'].forEach(fn => fn());
      } else {
        runner.pass.forEach(fn => fn(Object.assign({}, suite[key], { title: key, fullTitle: () => key, slow: () => "wtf is this" })));
        runner['test end'].forEach(fn => fn());
      }
    },
    []
  );
  runner.end.forEach(fn => fn());
}

module.exports = {
  giveToReporter,
}
