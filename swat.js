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

const asPromise = fn => (...args) => args.length + 1 === fn.length
  ? new Promise(done => fn(...args, done))
  : Promise.resolve(fn(...args))

const cons = (item, arr) => [item].concat(arr);

// LIB

const TEST = 'TEST';
const SUITE = 'SUITE';
const ROOT_SUITE = 'ROOT_SUITE';
const PASS = 'pass';
const FAIL = 'fail';

const hooks = ['before', 'beforeEach', 'afterEach', 'after'];

const createPass = name => ({ type: TEST, name, result: PASS });
const createFail = (name, error) => ({ type: TEST, name, result: FAIL, error });

const runTest = middlewares => context => (name, test) => {
  return asyncReduce(
    middlewares,
    [],
    (tuples, { before, after }) => asPromise(before)(name)
      .then(middlewareBeforeResult => cons([middlewareBeforeResult, after], tuples))
  ).then(beforeResultAfterFunctionTuples => {
    let r;
    try { r = asPromise(test)(context)
      .then(result => result === true ? createPass(name) : createFail(name, result))
    } catch(error) { r = Promise.resolve(createFail(name, error)); }
    return r.then(result => asyncReduce(
      beforeResultAfterFunctionTuples,
      result,
      (result, [middlewareBeforeResult, after]) => asPromise(after)(result, middlewareBeforeResult)
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

const runFull = middlewares => (prevBeforeEaches, prevAfterEaches) => (testObj, suiteName) => {
  const beforeEaches = testObj.beforeEach
    ? prevBeforeEaches.concat([testObj.beforeEach])
    : prevBeforeEaches;
  const afterEaches = testObj.afterEach
    ? [testObj.afterEach].concat(prevAfterEaches)
    : prevAfterEaches;
  const testAndSuiteTuples = Object.keys(testObj)
    .filter(key => !hooks.find(hook => hook === key))
    .map(key => [key, testObj[key]])
  return Promise.resolve(testObj.before ? asPromise(testObj.before)() : void(0))
    .then(() => asyncReduce(
      testAndSuiteTuples,
      { tests: [], suites: [] },
      (prev, [name, tos]) =>
        ( typeof tos === 'function'
        ? asyncReduce(beforeEaches, void(0), (prev, be) => asPromise(be)(prev))
          .then(context => runTest(middlewares)(context)(name, tos)
            .then(returnPrevious(() =>
              asyncReduce(afterEaches, context, (prev, ae) => asPromise(ae)(prev))
            ))
          )
        : typeof tos === 'object'
          ? runFull(middlewares)(beforeEaches, afterEaches)(tos, name)
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
      ? asPromise(testObj.after)()
      : Promise.resolve(void(0)))
    )
  )
}

const timer = now => ({
  before: now,
  after: (result, start) => Object.assign({}, result, { duration: now() - start }),
})

const run = runFull([timer(nanoNow)])([],[])

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
  runFull,
  run,
  assertMany,
  getFailedTests,
  TEST,
  SUITE,
  ROOT_SUITE,
  PASS,
  FAIL,
}
