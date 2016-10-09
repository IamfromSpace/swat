// TODO:  This should always use the most stable version
const { runFull, assertMany, ROOT_SUITE, SUITE, TEST, PASS, FAIL } = require('./swat.js');
const fp = require('lodash/fp');
const sinon = require('sinon');

const MOCK_CONTEXT = 'MOCK_CONTEXT';
const DOUBLE_MOCK_CONTEXT = 'DOUBLE_MOCK_CONTEXT';

module.exports = {
  'runFull': {
    beforeEach: () => ({
      mockMiddleware: {
        before: name => name,
        after: (result, name) => Object.assign({}, result, { middlewareBeforeResult: name })
      },
      mockBeforeEach: prevContext => prevContext === 'undefined'
        ? DOUBLE_MOCK_CONTEXT
        : MOCK_CONTEXT
      ,
      mockAfterEach: sinon.spy(),
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
    }
  },
}
