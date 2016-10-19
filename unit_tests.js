// TODO:  This should always use the most stable version
const { _runCreatorCreator, assertMany, ROOT_SUITE, SUITE, TEST, PASS, FAIL } = require('./swat.js');
const fp = require('lodash/fp');

const ERROR = 'ERROR';
const SHORT_TIMEOUT = 3;
const TEST_TIMEOUT = 10;
const ASYNC_TIMEOUT = TEST_TIMEOUT / 2;
const ASYNC_FAIL_TIMEOUT = TEST_TIMEOUT * 2;

const doWaitDo = (before, after) => (before(), setTimeout(after, ASYNC_TIMEOUT));
const doWaitDoPromise = (before, after) => new Promise(resolve => doWaitDo(before, () => resolve(after())));

const traceAndReturnContext = name => context => (context.push(name), context);
const traceAndReturnContextCallback = name => (context, cb) => doWaitDo(
  () => { traceAndReturnContext('start-' + name)(context) },
  () => { cb(traceAndReturnContext('end-' + name)(context)) }
);
const traceAndReturnContextPromise = name => context => doWaitDoPromise(
  () => { traceAndReturnContext('start-' + name)(context) },
  () => traceAndReturnContext('end-' + name)(context)
);

function MockError(msg) {
  this.msg = msg;
}

module.exports = {
  '_runCreatorCreator': {
    beforeEach: () => {
      // Tracking our context is a pretty difficult task
      // We need to be sure that we never share contexts between two tests
      // and then all hooks are called in the proper order.
      // To do this, we pass in a new array each time that context is initialized
      // and we hold all these arrays in the `contextTrackers` array.
      // Each of our hooks and tests then push their name to the current context
      // and (when possible) forward the context.
      // We use push because we need to mutate the array in order to inspect it later.
      const contextTrackers = [[]];
      let currentTrackerIndex = 0;

      return {
        contextTrackers,
        getTrackingContext: () => {
          contextTrackers.push([]);
          currentTrackerIndex++;
          return contextTrackers[currentTrackerIndex];
        },
        mockMiddleware: {
          name: 'mockMiddleware',
          before: name => name,
          after: (result, name) => Object.assign({}, result, { middlewareBeforeResult: name })
        },
        mockBefore: () => { contextTrackers[currentTrackerIndex].push('mockBefore') },
        mockBeforeEach1: traceAndReturnContext('mockBeforeEach1'),
        mockBeforeEach2: traceAndReturnContext('mockBeforeEach2'),
        mockAfterEach1: traceAndReturnContext('mockAfterEach1'),
        mockAfterEach2: traceAndReturnContext('mockAfterEach2'),
        mockAfter: () => { contextTrackers[currentTrackerIndex].push('mockAfter') },
        basicPassingTest: context => {
          traceAndReturnContext('basicPassingTest')(context);
          return true;
        },
        basicFailingTest: context => {
          traceAndReturnContext('basicFailingTest')(context);
          return ERROR;
        },
        callbackBefore: cb => doWaitDo(
          () => { contextTrackers[currentTrackerIndex].push('start-callbackBefore'); },
          () => { contextTrackers[currentTrackerIndex].push('end-callbackBefore'); cb() }
        ),
        callbackMiddleware: {
          name: 'callbackMiddleware',
          before: (name, cb) => { setTimeout(() => cb(name), ASYNC_TIMEOUT); },
          after: (result, name, cb) => doWaitDo(
            () => {},
            () => { cb(Object.assign({}, result, { middlewareBeforeResult: name })) }
          ),
        },
        callbackBeforeEach: traceAndReturnContextCallback('callbackBeforeEach'),
        callbackAfterEach: traceAndReturnContextCallback('callbackAfterEach'),
        callbackPassingTest: (context, cb) => doWaitDo(
          () => { traceAndReturnContext('start-callbackPassingTest')(context) },
          () => { traceAndReturnContext('end-callbackPassingTest')(context); cb(true) }
        ),
        callbackAfter: cb => doWaitDo(
          () => { contextTrackers[currentTrackerIndex].push('start-callbackAfter'); },
          () => { contextTrackers[currentTrackerIndex].push('end-callbackAfter'); cb() }
        ),
        promiseBefore: () => doWaitDoPromise(
          () => { contextTrackers[currentTrackerIndex].push('start-promiseBefore'); },
          () => contextTrackers[currentTrackerIndex].push('end-promiseBefore')
        ),
        promiseMiddleware: {
          name: 'promiseMiddleware',
          before: (name) => new Promise(r => setTimeout(r, ASYNC_TIMEOUT, name)),
          after: (result, name) => doWaitDoPromise(
            () => {},
            () => Object.assign({}, result, { middlewareBeforeResult: name })
          ),
        },
        promiseBeforeEach: traceAndReturnContextPromise('promiseBeforeEach'),
        promisePassingTest: context => doWaitDoPromise(
          () => { traceAndReturnContext('start-promisePassingTest')(context) },
          () => { traceAndReturnContext('end-promisePassingTest')(context); return true; }
        ),
        promiseAfterEach: traceAndReturnContextPromise('promiseAfterEach'),
        promiseAfter: () => doWaitDoPromise(
          () => { contextTrackers[currentTrackerIndex].push('start-promiseAfter'); },
          () => contextTrackers[currentTrackerIndex].push('end-promiseAfter')
        ),
        timeoutPromise: () => new Promise(r => { setTimeout(r, ASYNC_FAIL_TIMEOUT) }),
        timeoutPromiseTest: context => new Promise(r => {
          context.push('start-timeoutPromiseTest');
          setTimeout(r, ASYNC_FAIL_TIMEOUT)
        }),
      }
    },
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, no test hooks, no tests, no suites, no suiteName': () => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [],
        suites: [],
      };
      return _runCreatorCreator(() => {}, TEST_TIMEOUT, Error, [], [])([])({}).then(actual =>
        fp.isEqual(expected)(actual) || { expected, actual }
      );
    },
    'with middlewares, prevBeforeEaches, prevAfterEaches, no test hooks, basic passing test, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'always passes',
          result: PASS,
          middlewareBeforeResult: 'always passes',
        }],
        suites: [],
      };
      const expectedContextTrackers = [
        [],
        [
          'mockBeforeEach1',
          'basicPassingTest',
          'mockAfterEach1',
        ],
      ];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [c.mockBeforeEach1], [c.mockAfterEach1])([c.mockMiddleware])({
        // START TESTS UNDER TEST
        'always passes': c.basicPassingTest,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'no middlewares, prevBeforeEaches, prevAfterEaches, test hooks, basic passing test, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedContextTrackers = [
        ['mockBefore'],
        [
          'mockBeforeEach1',
          'mockBeforeEach2',
          'basicPassingTest',
          'mockAfterEach2',
          'mockAfterEach1',
          'mockAfter',
        ],
      ];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [c.mockBeforeEach1], [c.mockAfterEach1])([])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach2,
        'always passes': c.basicPassingTest,
        afterEach: c.mockAfterEach2,
        after: c.mockAfter,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, test hooks, basic passing/failing/incorrect type tests, timeout test, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'times out',
          result: FAIL,
          error: new MockError('times out timed out in ' + TEST_TIMEOUT + 'ms.'),
        }, {
          type: TEST,
          name: 'wrong type',
          result: FAIL,
          // TODO: don't use hard coded string
          error: 'All test object values must be a function (test) or an object (suite)'
        }, {
          type: TEST,
          name: 'always fails',
          result: FAIL,
          error: ERROR,
        }, {
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedContextTrackers = [
        ['mockBefore'],
        ['mockBeforeEach1', 'basicPassingTest', 'mockAfterEach1'],
        ['mockBeforeEach1', 'basicFailingTest', 'mockAfterEach1'],
        ['mockBeforeEach1', 'start-timeoutPromiseTest', 'mockAfterEach1', 'mockAfter'],
      ];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach1,
        'always passes': c.basicPassingTest,
        'always fails': c.basicFailingTest,
        'wrong type': 'STRING',
        'times out': c.timeoutPromiseTest,
        afterEach: c.mockAfterEach1,
        after: c.mockAfter,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'no middlewares, prevBeforeEaches, prevAfterEaches, no test hooks, and basic passing test': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [],
        suites: [{
          type: SUITE,
          name: 'a suite',
          tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
            type: TEST,
            name: 'always passes',
            result: PASS,
          }],
          suites: [],
        }],
      };
      const expectedContextTrackers = [[], [
        'mockBeforeEach1',
        'basicPassingTest',
        'mockAfterEach1',
      ]];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [c.mockBeforeEach1], [c.mockAfterEach1])([])({
        // START TESTS UNDER TEST
        'a suite': {
          'always passes': c.basicPassingTest,
        }
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'middlewares, prevBeforeEaches, prevAfterEaches, beforeEach and afterEach hooks, one suite with promise passing test': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [],
        suites: [{
          type: SUITE,
          name: 'a suite',
          tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
            type: TEST,
            name: 'always passes',
            result: PASS,
            middlewareBeforeResult: 'always passes',
          }],
          suites: [],
        }],
      };
      const expectedContextTrackers = [[], [
        'mockBeforeEach1',
        'mockBeforeEach2',
        'start-promisePassingTest',
        'end-promisePassingTest',
        'mockAfterEach2',
        'mockAfterEach1',
      ]];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [c.mockBeforeEach1], [c.mockAfterEach1])([c.mockMiddleware])({
        // START TESTS UNDER TEST
        beforeEach: c.mockBeforeEach2,
        afterEach: c.mockAfterEach2,
        'a suite': {
          'always passes': c.promisePassingTest,
        }
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'Should fail a promise when a nested suite before times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        'a suite': {
          before: c.timeoutPromise,
        },
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('a suite before hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected, actual) || { expected, actual };
      });
    },
    'async callback middlewares, test hooks, invalid timeout, and passing test (no prevBefore/AfterEaches)': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedContextTrackers = [
        ['start-callbackBefore', 'end-callbackBefore'],
        [
          'start-callbackBeforeEach',
          'end-callbackBeforeEach',
          'start-callbackPassingTest',
          'end-callbackPassingTest',
          'start-callbackAfterEach',
          'end-callbackAfterEach',
          'start-callbackAfter',
          'end-callbackAfter',
        ],
      ];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [], [])([])({
        // START TESTS UNDER TEST
        timeout: '1',
        before: c.callbackBefore,
        beforeEach: c.callbackBeforeEach,
        'always passes': c.callbackPassingTest,
        afterEach: c.callbackAfterEach,
        after: c.callbackAfter,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'async promise middlewares, test hooks, and passing test (no prevBefore/AfterEaches)': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedContextTrackers = [
        ['start-promiseBefore', 'end-promiseBefore'],
        [
          'start-promiseBeforeEach',
          'end-promiseBeforeEach',
          'start-promisePassingTest',
          'end-promisePassingTest',
          'start-promiseAfterEach',
          'end-promiseAfterEach',
          'start-promiseAfter',
          'end-promiseAfter',
        ],
      ];
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, Error, [], [])([])({
        // START TESTS UNDER TEST
        before: c.promiseBefore,
        beforeEach: c.promiseBeforeEach,
        'always passes': c.promisePassingTest,
        afterEach: c.promiseAfterEach,
        after: c.promiseAfter,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTrackers)(expectedContextTrackers) ||
          { actualContextTrackers: c.contextTrackers, expectedContextTrackers }
        ,
      ]));
    },
    'Should fail a promise when Root Suite before times out, with a custom timeout': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        timeout: SHORT_TIMEOUT,
        before: c.promiseBefore,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('Root suite before hook timed out in ' + SHORT_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when Root Suite after times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        after: c.timeoutPromise,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('Root suite after hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when a named suite before times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [], 'SUITE NAME')([])({
        before: c.timeoutPromise,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('SUITE NAME before hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected, actual) || { expected, actual };
      });
    },
    'Should fail a promise when a named suite after times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [], 'SUITE NAME')([])({
        after: c.timeoutPromise,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('SUITE NAME after hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when a beforeEach hook times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        beforeEach: c.timeoutPromise,
        'always passes': c.basicPassingTest,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('always passes beforeEach hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when an afterEach hook times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([])({
        'always passes': c.basicPassingTest,
        afterEach: c.timeoutPromise,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('always passes afterEach hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when a middleware before times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([{
        name: 'beforeTimeoutMiddleware',
        before: c.timeoutPromise,
        after: () => {},
      }])({
        'always passes': c.basicPassingTest,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('beforeTimeoutMiddleware middleware before hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
    'Should fail a promise when a middleware after times out': c => {
      return _runCreatorCreator(c.getTrackingContext, TEST_TIMEOUT, MockError, [], [])([{
        name: 'afterTimeoutMiddleware',
        before: () => {},
        after: c.timeoutPromise,
      }])({
        'always passes': c.basicPassingTest,
      })
      .then(_ => 'Should have thrown an error')
      .catch(actual => {
        const expected = new MockError('afterTimeoutMiddleware middleware after hook timed out in ' + TEST_TIMEOUT + 'ms.');
        return fp.isEqual(expected)(actual) || { expected, actual };
      });
    },
  },
}
