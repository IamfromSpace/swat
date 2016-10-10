// TODO:  This should always use the most stable version
const { runFull, assertMany, ROOT_SUITE, SUITE, TEST, PASS, FAIL } = require('./swat.js');
const fp = require('lodash/fp');

const ERROR = 'ERROR';

const traceAndReturnContext = name => context => (context.push(name), context);

module.exports = {
  'runFull': {
    beforeEach: () => {
      const contextTracker = [];

      return {
        contextTracker,
        mockMiddleware: {
          before: name => name,
          after: (result, name) => Object.assign({}, result, { middlewareBeforeResult: name })
        },
        mockBefore: () => { contextTracker.push('mockBefore') },
        mockBeforeEach1: traceAndReturnContext('mockBeforeEach1'),
        mockBeforeEach2: traceAndReturnContext('mockBeforeEach2'),
        mockAfterEach1: traceAndReturnContext('mockAfterEach1'),
        mockAfterEach2: traceAndReturnContext('mockAfterEach2'),
        mockAfter: () => { contextTracker.push('mockAfter') },
        basicPassingTest: context => {
          traceAndReturnContext('basicPassingTest')(context);
          return true;
        },
        basicFailingTest: context => {
          traceAndReturnContext('basicFailingTest')(context);
          return ERROR;
        },
        callbackPassingTest: (_, cb) => (cb(true), 'CB_TEST'),
        callbackContextualTest: (context, cb) => (cb(context), 'CB_TEST'),
        promisePassingTest: () => Promise.resolve(true),
        promiseContextualTest: context => Promise.resolve(context),
      }
    },
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, no test hooks, no tests, no suites, no suiteName': () => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [],
        suites: [],
      };
      return runFull([])([], [])({}).then(actual =>
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
      const expectedContextTracker = [
        'mockBeforeEach1',
        'basicPassingTest',
        'mockAfterEach1',
      ];
      return runFull([c.mockMiddleware], c.contextTracker)([c.mockBeforeEach1], [c.mockAfterEach1])({
        // START TESTS UNDER TEST
        'always passes': c.basicPassingTest,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTracker)(expectedContextTracker) ||
          { actualContextTracker: c.contextTracker, expectedContextTracker }
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
      const expectedContextTracker = [
        'mockBefore',
        'mockBeforeEach1',
        'mockBeforeEach2',
        'basicPassingTest',
        'mockAfterEach2',
        'mockAfterEach1',
        'mockAfter'
      ];
      return runFull([], c.contextTracker)([c.mockBeforeEach1], [c.mockAfterEach1])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach2,
        'always passes': c.basicPassingTest,
        afterEach: c.mockAfterEach2,
        after: c.mockAfter,
        // END TESTS UNDER TEST
      }).then(actual => assertMany([
        fp.isEqual(expected)(actual) || { expected, actual },
        fp.isEqual(c.contextTracker)(expectedContextTracker) ||
          { actualContextTracker: c.contextTracker, expectedContextTracker }
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
      const expectedContextTracker = [
        'mockBefore',
        'mockBeforeEach1',
        'basicPassingTest',
        'mockAfterEach1',
        'mockBeforeEach1',
        'basicFailingTest',
        'mockAfterEach1',
        'mockAfter'
      ];
      return runFull([], c.contextTracker)([], [])({
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
        fp.isEqual(c.contextTracker)(expectedContextTracker) ||
          { actualContextTracker: c.contextTracker, expectedContextTracker }
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
      return runFull([], c.contextTracker)([], [])({
        // START TESTS UNDER TEST
        'a suite': {
          'always passes': c.basicPassingTest,
        }
        // END TESTS UNDER TEST
      }).then(actual => fp.isEqual(expected)(actual) || { expected, actual });
    },
  },
}
