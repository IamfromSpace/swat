// TODO:  This should always use the most stable version
const { runFullWithContextCreator, assertMany, ROOT_SUITE, SUITE, TEST, PASS, FAIL } = require('./swat.js');
const fp = require('lodash/fp');

const ERROR = 'ERROR';
const ASYNC_TIMEOUT = 5;

const doWaitDo = (before, after) => (before(), setTimeout(after, ASYNC_TIMEOUT));

const traceAndReturnContext = name => context => (context.push(name), context);
const traceAndReturnContextCallback = name => (context, cb) => doWaitDo(
  () => { traceAndReturnContext('start-' + name)(context) },
  () => { cb(traceAndReturnContext('end-' + name)(context)) }
);

module.exports = {
  'runFullWithContextCreator': {
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
      }
    },
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, no test hooks, no tests, no suites, no suiteName': () => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [],
        suites: [],
      };
      return runFullWithContextCreator(() => {})([])([], [])({}).then(actual =>
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
      return runFullWithContextCreator(c.getTrackingContext)([c.mockMiddleware])([c.mockBeforeEach1], [c.mockAfterEach1])({
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
      return runFullWithContextCreator(c.getTrackingContext)([])([c.mockBeforeEach1], [c.mockAfterEach1])({
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
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, test hooks, basic passing/failing/incorrect type tests, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
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
        ['mockBeforeEach1', 'basicFailingTest', 'mockAfterEach1', 'mockAfter'],
      ];
      return runFullWithContextCreator(c.getTrackingContext)([])([], [])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach1,
        'always passes': c.basicPassingTest,
        'always fails': c.basicFailingTest,
        'wrong type': 'STRING',
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
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, no test hooks, one suite with basic passing test': (c) => {
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
      return runFullWithContextCreator(c.getTrackingContext)([])([], [])({
        // START TESTS UNDER TEST
        'a suite': {
          'always passes': c.basicPassingTest,
        }
        // END TESTS UNDER TEST
      }).then(actual => fp.isEqual(expected)(actual) || { expected, actual });
    },
    'async callback middlewares, test hooks, and passing test (no prevBefore/AfterEaches)': (c) => {
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
      return runFullWithContextCreator(c.getTrackingContext)([])([], [])({
        // START TESTS UNDER TEST
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
  },
}
