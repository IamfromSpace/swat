// TODO:  This should always use the most stable version
const { runFull, assertMany, ROOT_SUITE, SUITE, TEST, PASS, FAIL } = require('./swat.js');
const fp = require('lodash/fp');
const sinon = require('sinon');

const MOCK_CONTEXT = 'MOCK_CONTEXT';
const DOUBLE_MOCK_CONTEXT = 'DOUBLE_MOCK_CONTEXT';

const STUB_RETURN = 'STUB_RETURN';

module.exports = {
  'runFull': {
    beforeEach: () => ({
      mockMiddleware: {
        before: name => name,
        after: (result, name) => Object.assign({}, result, { middlewareBeforeResult: name })
      },
      mockBefore: sinon.spy(),
      mockBeforeEach: prevContext => (console.log(prevContext), typeof prevContext === 'undefined'
        ? MOCK_CONTEXT
        : DOUBLE_MOCK_CONTEXT
      ),
      mockAfterEach: sinon.stub().returns(STUB_RETURN),
      mockAfter: sinon.spy(),
      basicPassingTest: () => true,
      basicContextualTest: context => context,
      callbackPassingTest: (_, cb) => (cb(true), 'CB_TEST'),
      callbackContextualTest: (context, cb) => (cb(context), 'CB_TEST'),
      promisePassingTest: () => Promise.resolve(true),
      promiseContextualTest: context => Promise.resolve(context),
    }),
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
    'with middlewares, prevBeforeEaches, prevAfterEaches, no test hooks, basic passing/failing tests, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'fails due to context',
          result: FAIL,
          error: MOCK_CONTEXT,
          middlewareBeforeResult: 'fails due to context',
        }, {
          type: TEST,
          name: 'always passes',
          result: PASS,
          middlewareBeforeResult: 'always passes',
        }],
        suites: [],
      };
      const expectedAfterEachArgs = [[MOCK_CONTEXT], [MOCK_CONTEXT]];
      return runFull([c.mockMiddleware])([c.mockBeforeEach], [c.mockAfterEach])({
        // START TESTS UNDER TEST
        'always passes': c.basicPassingTest,
        'fails due to context': c.basicContextualTest,
        // END TESTS UNDER TEST
      }).then(actual => {
        const actualAfterEachArgs = c.mockAfterEach.args;
        return assertMany([
          fp.isEqual(expected)(actual) || { expected, actual },
          fp.isEqual(actualAfterEachArgs)(expectedAfterEachArgs) ||
            { expectedAfterEachArgs, actualAfterEachArgs }
          ,
        ]);
      });
    },
    'no middlewares, prevBeforeEaches, prevAfterEaches, test hooks, basic passing/failing tests, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'fails due to context',
          result: FAIL,
          error: DOUBLE_MOCK_CONTEXT,
        }, {
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedBeforeArgs = [[]];
      const expectedAfterEachArgs = [
        [DOUBLE_MOCK_CONTEXT],
        [STUB_RETURN],
        [DOUBLE_MOCK_CONTEXT],
        [STUB_RETURN],
      ];
      const expectedAfterArgs = [[]];
      return runFull([])([c.mockBeforeEach], [c.mockAfterEach])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach,
        'always passes': c.basicPassingTest,
        'fails due to context': c.basicContextualTest,
        afterEach: c.mockAfterEach,
        after: c.mockAfter,
        // END TESTS UNDER TEST
      }).then(actual => {
        const actualBeforeArgs = c.mockBefore.args;
        const actualAfterEachArgs = c.mockAfterEach.args;
        const actualAfterArgs = c.mockAfter.args;
        return assertMany([
          fp.isEqual(expected)(actual) || { expected, actual },
          fp.isEqual(actualBeforeArgs)(expectedBeforeArgs) ||
            { expectedBeforeArgs, actualBeforeArgs }
          ,
          fp.isEqual(actualAfterEachArgs)(expectedAfterEachArgs) ||
            { expectedAfterEachArgs, actualAfterEachArgs }
          ,
          fp.isEqual(actualAfterArgs)(expectedAfterArgs) ||
            { expectedAfterArgs, actualAfterArgs }
          ,
        ]);
      });
    },
    'no middlewares, no prevBeforeEaches, no prevAfterEaches, test hooks, basic passing/failing tests, no suites, no suiteName': (c) => {
      const expected = {
        type: ROOT_SUITE,
        name: void(0), // TODO: remove the need for this undefined key.
        tests: [{ // TODO: Order of this array is not guaranteed, need to allow for that
          type: TEST,
          name: 'fails due to context',
          result: FAIL,
          error: MOCK_CONTEXT,
        }, {
          type: TEST,
          name: 'always passes',
          result: PASS,
        }],
        suites: [],
      };
      const expectedBeforeArgs = [[]];
      const expectedAfterEachArgs = [[MOCK_CONTEXT], [MOCK_CONTEXT]];
      const expectedAfterArgs = [[]];
      return runFull([])([], [])({
        // START TESTS UNDER TEST
        before: c.mockBefore,
        beforeEach: c.mockBeforeEach,
        'always passes': c.basicPassingTest,
        'fails due to context': c.basicContextualTest,
        afterEach: c.mockAfterEach,
        after: c.mockAfter,
        // END TESTS UNDER TEST
      }).then(actual => {
        const actualBeforeArgs = c.mockBefore.args;
        const actualAfterEachArgs = c.mockAfterEach.args;
        const actualAfterArgs = c.mockAfter.args;
        return assertMany([
          fp.isEqual(expected)(actual) || { expected, actual },
          fp.isEqual(actualBeforeArgs)(expectedBeforeArgs) ||
            { expectedBeforeArgs, actualBeforeArgs }
          ,
          fp.isEqual(actualAfterEachArgs)(expectedAfterEachArgs) ||
            { expectedAfterEachArgs, actualAfterEachArgs }
          ,
          fp.isEqual(actualAfterArgs)(expectedAfterArgs) ||
            { expectedAfterArgs, actualAfterArgs }
          ,
        ]);
      });
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
      return runFull([])([], [])({
        // START TESTS UNDER TEST
        'a suite': {
          'always passes': c.basicPassingTest,
        }
        // END TESTS UNDER TEST
      }).then(actual => fp.isEqual(expected)(actual) || { expected, actual });
    },
  },
}
