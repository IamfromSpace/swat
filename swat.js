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

// LIB

const hooks = ['before', 'beforeEach', 'afterEach', 'after'];

const runTest = now => test => {
  let r;
  const t = now();
  try { r = Promise.resolve(test())
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
  return asyncReduce(testAndSuiteTuples, {}, (prev, [name, tos]) => (typeof tos === 'function'
    ? asyncReduce(beforeEaches, null, (_, be) => Promise.resolve(be()))
      .then(() => runTest(now)(tos))
      .then(result => asyncReduce(afterEaches, null, (_, ae) => Promise.resolve(ae()))
        .then(() => result)
      )
    : typeof tos === 'object'
      ? runFull(now)(beforeEaches, afterEaches)(tos)
      : Promise.resolve({
          result: 'fail',
          error: 'All test object values must be a function (test) or an object (suite)',
        })
    ).then(result => Object.assign(prev, {[name]: result}))
  )
}

const run = runFull(nanoNow)([],[])

const assertMany = list => {
  if (list && list.length === 0) return 'no assertions!'
  const error = list.find(assertion => assertion !== true)
  return typeof error === 'undefined' ? true : error;
}

// TEST TESTS/PLAYGROUND

const tests = {
  'returns undefined': () => {},
  test1: () => true,
  test2: () => false,
  test3: () => 'bad',
  test4: () => Promise.resolve(true),
  test5: () => Promise.resolve(false),
}

const testsAsTuples = [
  ['returns undefined', () => {
    //do something
    //do something else
    return true;
  }],
  ['test1', () => {
    //do something
    //do something else
    return true || 'this better not fail!';
  }],
  ['test2', () => {
    //do something
    //do something else
    return false;
  }],
  ['suite2', [
    ['test6', () => {
      //do something
      //do something else
      return 'hey' === 'ho' || 'nested in a suite';
    }],
    ['suite3', [
      ['test7', () => {
        //do something
        //do something else
        return 0 === 1 || 'very nested';
      }],
    ]],
  ]],
]

const suites = {
  'a str': 'str',

  'returns undefined': () => {
    //do something
    //do something else
  },

  test1: () => {
    //do something
    //do something else
    return true || 'this better not fail!';
  },

  'very async': () => {
    return new Promise(r => setTimeout(() => r('took 1 second'), 1000))
  },

  'throws': () => { throw 'shiiiiiit an exception'; },

  suite2: {
    test6: () => {
      //do something
      //do something else
      return assertMany([true, 'hey' === 'ho' || 'nested in a suit', 7 === 9 || "seven wasn't nine"])
    },

    test7: () => {
      //do something
      //do something else
      return assertMany([])
    },

    suite3: {
      test7: () => {
        //do something
        //do something else
        return 0 === 1 || 'prettydamnnested'
      },
    },
  },
};

let str;

const beforeEachTests = {
  afterEach: () => { console.log('ae-a'); str = 'scramble!'; },
  beforeEach: () => { console.log('be-a'); str = 'a'; },
  test1: () => { console.log('t-a'); return 't' + str; },
  hark: {
    afterEach: () => { console.log('ae-b'); str = 'scramble!'; },
    beforeEach: () => { console.log('be-b'); str = 'b'; },
    test2: () => { console.log('t-b'); return 't' + str; },
    suite2: {
      afterEach: () => { console.log('ae-c'); str = 'scramble!'; },
      beforeEach: () => { console.log('be-c'); str = 'c'; },
      test3: () => { console.log('t-c'); return 't' + str; },
      suite3: {
        afterEach: () => { console.log('ae-d'); str = 'scramble!'; },
        beforeEach: () => { console.log('be-d'); str = 'd'; },
        test4: () => { console.log('t-d'); return 't' + str; },
      }
    }
  },
  suite1: () => { console.log('t-a2'); return 't' + str + '2'; },
}

run(suites).then(console.log)
