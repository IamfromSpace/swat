// HELPERS

const logAndContinue = a => { console.log(a); return a; };

const asyncReduce = (list, init, asyncFunc) => {
  const recurse = depth => prev => depth == list.length
    ? Promise.resolve(prev)
    : asyncFunc(prev, list[depth]).then(recurse(depth + 1));
  return recurse(0)(init);
}

const nanoNow = () => {
  const n = process.hrtime()
  return n[0]*1000 + n[1] / 1000000;
}

const returnPrevious = func => a => func().then(() =>a);

const asPromise = (timeout, createError) => (fn, caller) => (...args) => {
  let timeoutId;
  const errMsg = caller + ' timed out in ' + timeout + 'ms.';
  return Promise.race([
    new Promise((resolve, reject) => {
      timeoutId = setTimeout(msg => reject(new createError(msg)), timeout, errMsg);
    }),
    args.length + 1 === fn.length
      ? new Promise(done => fn(...args, done))
      : Promise.resolve(fn(...args))
  ]).then(result => (timeoutId && clearTimeout(timeoutId), result));
}

const cons = (item, arr) => [item].concat(arr);

// LIB

const TEST = 'TEST';
const SUITE = 'SUITE';
const ROOT_SUITE = 'ROOT_SUITE';
const PASS = 'pass';
const FAIL = 'fail';
const SKIP = 'skip';

const hooks = ['before', 'beforeEach', 'afterEach', 'after', 'timeout'];

const createPass = name => ({ type: TEST, name, result: PASS });
const createSkip = name => ({ type: TEST, name, result: SKIP });
const createFail = (name, error) => ({ type: TEST, name, result: FAIL, error });

const runTest = (timeout, createError) => middlewares => context => (name, test) => {
  const p = asPromise(timeout, createError);
  return asyncReduce(
    middlewares,
    [],
    (tuples, { name: mName, before, after }) => p(before, mName + ' middleware before hook')(name)
      .then(middlewareBeforeResult => cons([middlewareBeforeResult, after, mName], tuples))
  ).then(beforeResultAfterFunctionTuples => {
    let r;
    try { r = p(test, name)(context)
      .then(result => result === true ? createPass(name) : createFail(name, result))
      .catch(error => createFail(name, error))
    } catch(error) { r = Promise.resolve(createFail(name, error)); }
    return r.then(result => asyncReduce(
      beforeResultAfterFunctionTuples,
      result,
      (result, [middlewareBeforeResult, after, mName]) => p(after, mName + ' middleware after hook')(result, middlewareBeforeResult)
    ));
  })
}

const addResult = previousResults => result => {
switch (result.type) {
  case TEST:
    return Object.assign(previousResults, { tests: cons(result, previousResults.tests) });
  case SUITE:
      return Object.assign(previousResults, { suites: cons(result, previousResults.suites) });
    default:
      throw Error("Trying to add a result of neither TEST nor SUITE type " + JSON.stringify(result, null, 2))
  }
}

const defaultSkipRegex = /^skip-/i;
const defaultOnlyRegex = /.*/i;

const _runCreatorCreator = (createInitContext, defaultTimeout, createError, prevBeforeEaches, prevAfterEaches, suiteName) => middlewares => (testObj, skipRegex, onlyRegex) => {
  const skip = skipRegex || defaultSkipRegex;
  const only = onlyRegex || defaultOnlyRegex;
  const timeout = typeof testObj.timeout === 'number' ? testObj.timeout : defaultTimeout;
  const p = asPromise(timeout, createError);
  const beforeEaches = testObj.beforeEach
    ? prevBeforeEaches.concat([testObj.beforeEach])
    : prevBeforeEaches;
  const afterEaches = testObj.afterEach
    ? [testObj.afterEach].concat(prevAfterEaches)
    : prevAfterEaches;
  const testAndSuiteTuples = Object.keys(testObj)
    .filter(key => !hooks.find(hook => hook === key))
    .map(key => [key, testObj[key]])
  return Promise.resolve(testObj.before ? p(testObj.before, `${suiteName || 'Root suite'} before hook`)() : void(0))
    .then(() => asyncReduce(
      testAndSuiteTuples,
      { tests: [], suites: [] },
      (prev, [name, tos]) =>
        ( typeof tos === 'function'
        ? !skip.test(name) && only.test(name)
          ? asyncReduce(beforeEaches, createInitContext(), (prev, be) => p(be, `${name} beforeEach hook`)(prev))
            .then(context => runTest(timeout, createError)(middlewares)(context)(name, tos)
              .then(returnPrevious(() =>
                asyncReduce(afterEaches, context, (prev, ae) => p(ae, `${name} afterEach hook`)(prev))
              ))
            )
          : Promise.resolve(createSkip(name))
        : typeof tos === 'object'
          ? _runCreatorCreator(createInitContext, timeout, createError, beforeEaches, afterEaches, name)(middlewares)(tos, skip, only)
          : Promise.resolve(
            createFail(name, 'All test object values must be a function (test) or an object (suite)')
          )
        )
        .then(addResult(prev))
    )
    .then(
      ({ tests, suites }) => ({
        type: typeof suiteName === 'undefined' ? ROOT_SUITE : SUITE,
        name: suiteName,
        tests,
        suites,
      })
    )
    .then(returnPrevious(() => testObj.after
      ? p(testObj.after, `${suiteName || 'Root suite'} after hook`)()
      : Promise.resolve(void(0)))
    )
  )
}

const runCreator = _runCreatorCreator(() => {}, 5000, Error, [], []);

const timer = now => ({
  name: 'timer',
  before: now,
  after: (result, start) => Object.assign({}, result, { duration: now() - start }),
})

const run = runCreator([timer(nanoNow)])

const assertMany = list => {
  if (list && list.length === 0) return 'no assertions!'
  const error = list.find(assertion => assertion !== true)
  return typeof error === 'undefined' ? true : error;
}

const getFailedTests = suite => suite.suites.reduce(
  (acc, s) => acc.concat(getFailedTests(s)),
  suite.tests.filter(t => t.result === FAIL)
);

module.exports = {
  _runCreatorCreator,
  runCreator,
  run,
  assertMany,
  getFailedTests,
  TEST,
  SUITE,
  ROOT_SUITE,
  PASS,
  FAIL,
  SKIP,
}
