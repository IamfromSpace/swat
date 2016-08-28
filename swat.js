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
const PASS = 'pass';
const FAIL = 'fail';

const hooks = ['before', 'beforeEach', 'afterEach', 'after'];

const injectName = name => obj => Object.assign({}, obj, { name });
const injectDuration = (start, now) => obj => Object.assign({}, obj, { duration: now() - start });

const createPass = () => ({ type: TEST, result: PASS });
const createFail = error => ({ type: TEST, result: FAIL, error });

const runTest = now => context => test => {
  let r;
  const t = now();
  try { r = asPromise(test)(context)
    .then(result => result === true ? createPass() : createFail(result))
  } catch(error) { r = Promise.resolve(createFail(error)); }
  return r.then(injectDuration(t, now));
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

const runFull = now => (prevBeforeEaches, prevAfterEaches) => testObj => {
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
      { type: SUITE, tests: [], suites: [] },
      (prev, [name, tos]) =>
        ( typeof tos === 'function'
        ? asyncReduce(beforeEaches, void(0), (prev, be) => asPromise(be)(prev))
          .then(context => runTest(now)(context)(tos)
            .then(returnPrevious(() =>
              asyncReduce(afterEaches, context, (prev, ae) => asPromise(ae)(prev))
            ))
          )
        : typeof tos === 'object'
          ? runFull(now)(beforeEaches, afterEaches)(tos)
          : Promise.resolve(
            createFail('All test object values must be a function (test) or an object (suite)')
          )
        )
        .then(injectName(name))
        .then(addResult(prev))
    ).then(returnPrevious(() => testObj.after
      ? asPromise(testObj.after)()
      : Promise.resolve(void(0)))
    )
  )
}

const run = runFull(nanoNow)([],[])

const assertMany = list => {
  if (list && list.length === 0) return 'no assertions!'
  const error = list.find(assertion => assertion !== true)
  return typeof error === 'undefined' ? true : error;
}

module.exports = {
  runFull,
  run,
  assertMany,
  TEST,
  SUITE,
  PASS,
  FAIL,
}
