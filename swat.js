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

// LIB

const hooks = ['before', 'beforeEach', 'afterEach', 'after'];

const runTest = now => context => test => {
  let r;
  const t = now();
  try { r = Promise.resolve(test(context))
    .then(result => result === true
      ? { result: 'pass', timeElapsed: now() - t }
      : { result: 'fail', error: result, timeElapsed: now() - t }
    )
  } catch(error) { r = Promise.resolve({ result: 'fail', error, timeElapsed: now() - t });}
  return r;
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
  return Promise.resolve(testObj.before && testObj.before())
    .then(() => asyncReduce(testAndSuiteTuples, {}, (prev, [name, tos]) => (typeof tos === 'function'
      ? asyncReduce(beforeEaches, void(0), (prev, be) => Promise.resolve(be(prev)))
        .then(context => runTest(now)(context)(tos)
          .then(returnPrevious(() =>
            asyncReduce(afterEaches, context, (prev, ae) => Promise.resolve(ae(prev)))
          ))
        )
      : typeof tos === 'object'
        ? runFull(now)(beforeEaches, afterEaches)(tos)
        : Promise.resolve({
            result: 'fail',
            error: 'All test object values must be a function (test) or an object (suite)',
          })
      ).then(result => Object.assign({}, prev, {[name]: result}))
    ).then(returnPrevious(() => Promise.resolve(testObj.after && testObj.after())))
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
}
