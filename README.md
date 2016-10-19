# SWAT

Swat is a composable, flexible, functional, and webpack-friendly unit testing framework for Javascript.  Swat uses one simple concept to improve upon previous libraries:  the test suites are data and the test runner is a function that transforms suite data into result data.

## Usage

### Syntax

Syntax is remenicent of other popular unit test frameworks with some minor differences.

Suites are represented as plain objects.  Object keys act as descriptions and values can be either tests or nested suites.  Tests are functions that will be executed by the test runner.

```javascript
const aSuite = {
  "a test": () => {/* ... */},
  "a nested suite": {
    "a nested test": () => {/* ... */}
  },
};
```

Unlike many frameworks, tests must return `true`, call the `done` callback with `true`, or eventually return `true` via a promise to pass.  Returning any other value, no value, or throwing a uncaught error will cause a failure.  This is to prevent an all too common issue where tests pass without testing anything--especially when testing async functions.

Any value other than true is used as the cause of the error, which allows us to use the following convenient syntax:

```javascript
const aSuite = {
  "a test": () => {
    return 7 === 8 || "Seven does not equal eight!";
  },
};

//error: "Seven does not equal eight!"
```

To make many assertions, a helper function is provided that will return an array of values that are not true from an array, or true if all values are.

```javascript
const aSuite = {
  "a test": () => {
    return assertMany([
      6 === 6 || "Six does not equal six!",
      7 === 8 || "Seven does not equal eight!",
      "hey" === "ho" || "Hey does not equal ho!",
    ]);
  },
};

//error: ["Seven does not equal eight!", "Hey does not equal ho!"]
```

This has an added advantage of showing _all_ errors, instead of only the first encountered.

## Running Tests

Swat does not require any cli commands.  Instead you can require in the `run` function, pass in the suite object, and get back a promise of the result object.  From there the result object can be transformed to a variety of formats, logged to the console, written to a file, a database, or posted via a REST call.  Then all you have to do is run `node my_test_suite.js`.

### Example

```javascript
//contents of suite1.js
module.exports = {
  test11: () => {
    // do stuff
    return "error in test 1"
  }
}

//contents of suite2.js
module.exports = {
  test21: () => {
    // do stuff
    return true;
  }
}

//contents of my_test_suite.js
const run = require('swat').run;

run({
  suite1: require('./suite1.js')
  suite2: require('./suite2.js')
})
.then(console.log)
```

If we run this file, we'll get the following bash output:

```
$ node my_test_suite.js
{
  suite1: {
    test11: { result: 'fail', error: "error in test 1" },
  },
  suite2: {
    test21: { result: 'pass' },
  },
}
```

Logging the result object is only one step better than doing nothing at all.  Instead, we can transform the result object in all sorts of ways, and then do whatever we want with the result.

```javascript
run(myTestSuite).then(result => {
  console.log(simpleReporter(result));
  fs.write('result.html', htmlReporter(result));
  fs.write('result.md', mdReporter(result));
  fetch(myTestResultEndpoint, {
    method: "POST",
    body: myTestResultEndpointReporter(result),
  });
});
```

## Writing Tests

### Using Context with before/afterEach

In Javascript it can be challenging to write tests because everything is mutable.  While the `const` keyword of ES6 has helped some, `const` only enforces that the _reference_ is never reassigned.  This is great for strings, floats, etc, but not very effective for objects or arrays.

Other libraries such as Immutable and Mori have helped the community write more immutable code, but it doesn't make sense for a testing library to depend on the usage of these libraries.

Variables that can mutate at any moment make it difficult to truly isolate test cases.  If one test result affects another, it can create unexpected results.  To solve this, Swat allows you to use build a new context for each test.

Every `beforeEach` hook and `afterEach` hook is passed in a single argument, and expects a return value.  The return value becomes the input of the next hook, and is eventually passed into the test.

Here is an example:

```javascript
// test file
run({
  beforeEach: (context) => {
    return context || { a: 0 };
  },
  test1: (context) => {
    context.a = 8;
    context.b = 9;
    return true;
  },
  test2: (context) => {
    context.c = 12;
    return true;
  },
  afterEach(context) => {
    console.log(context);
    return context;
  },
});

// console output from afterEach
{ a: 8, b: 9}
{ a: 0, c: 12}
```

Note that the outermost beforeEach of a run will always have an `undefined` context.  This is because you must build a brand new context for each and every test.

For nested tests, every `beforeEach` from its parent suites is excuted in order from parent to child, then the test is executed, and finally all `afterEach` hooks the parent suite is run from child to parent.

Here is an example:

```javascript
// test file
run({
  beforeEach: (context) => {
    return context || ["outer beforeEach"];
  },
  outerTest: (context) => {
    context.push("outer test");
    return true;
  },
  innerSuite: {
    beforeEach: (context) => {
      context.push(["inner beforeEach"]);
      return context;
    },
    outerTest: (context) => {
      context.push("inner test");
      return true;
    },
    afterEach: (context) => {
      context.push("inner afterEach");
      return context;
    },
  },
  afterEach: (context) => {
    context.push("outer afterEach");
    console.log(context);
  },
})


// console output from outer afterEach
["outer beforeEach", "outer test", "outer afterEach"]
["outer beforeEach", "inner beforeEach", "inner test", "inner afterEach", "outer afterEach"]
```

#### Other hooks

Swat also includes `before` and `after` hooks.  These are executed before and then after the _entire_ suite (including nested suites and other hooks) run.  These hooks do _not_ recieve a context argument and return values are ignored.  They are intended to set global/module level variables that are not practical to new up for each test.

Use these hooks sparingly; 99% of the time you can use context which is much much safer.

### Async Testing

Swat handles both callbacks and promises in testing.  You can return a promise in any test or hook.

```javascript
run({
  beforeEach: () => {
    return Promise.resolve('promise');
  },

  'test that returns a promise': (context) => {
    return Promise.resolve(context === 'promise');
  },
});
```

Or you can use callbacks in any test or hook by using the `done` parameter.  In the before/after hooks `done` will be passed in as the first argument, and in all other functions it will be passed as the second.  This means that all callback based tests must accept context, but you do not have to use it.

In the following example, `_` signifes that the parameter is ignored.  Both of the following tests will pass.

```javascript
run({
  before: (done)  => {
    setTimeout(() => { console.log('before'); done(); }, 1000);
  },

  beforeEach: (_, done) => {
    setTimeout(() => { done('callback'); }, 1000);
  },

  'test using context': (context, done) => {
    setTimeout(() => { done(context === 'callback'); }, 1000);
  },

  'test ignoring context': (_, done) => {
    setTimeout(() => { done(true); }, 1000);
  },
});
```

#### Timeouts

After 5 seconds (by default) if the promise is not resolved or the callback not called, the test will fail.  If you need to change this value, the test suite accepts a timeout key to override the default.  Note that this changes the timeout for ALL async functions (middlewares, hooks, tests, etc) in all child suites.

### Middlewares

Swat has support for "global" or "master" hooks that run directly before and after each test.  This enables measurement/notifications/etc of things that can only be performed at the time of test execution and need to run on every single test.  Middlewares also need a name for better error logging.  A good example is a timer middleware:

```javascript
const timer = {
  name: 'timer',
  before: (name) => {
    return Date.now();
  },
  after: (testResult, beforeResult) => {
    return Object.assign(
      testResult,
      { duration: Date.now() - beforeResult },
    );
  },
};
```

The middleware is just an object with a `before` and `after` property.  The `before` property is a function that accepts one argument, the name of the test about to be executed and returns a value that will be forwarded to the `after` function.

The `after` property is a function that accepts two arguments, the test result object, and the result returned by this middleware's `before` result for this test.  The return value of the `after` hook becomes the new test result.  Do _NOT_ mutate the test result; please return a new value.

The `runCreator` function accepts an array of middlewares and returns a `run` function:

```javascript
const runAndLogProgress = runCreator([logProgress, timer]);
runAndLogProgress(mySuite).then(result => {
  ...
});
```

The middlewares are executed in order before the test and then in reverse order after.  This means that time critical middlewares should be at the end of the list, as they will not be affected by others.  The total order of exection (assuming two middlewares) is as follows:

1. suite's before
1. suite's beforeEach
1. middleware[0]'s before
1. middleware[1]'s before
1. test
1. middleware[1]'s after
1. middleware[0]'s after
1. suite's afterEach
1. suite's after

Note that middlewares can be async and each middleware will wait on the next.  Middlewares can return a promise or use a callbacks--if it is supplied as an additional argument.

## FAQ

##### Why do `before` and `after` not recieve a context argument?

The key to context, is that it is new for every single test.  If the before function created the context, then the same context would be passed to each beforeEach, which meant the same reference would propogate throught all tests--defeating the purpose.  A deep copy of a value returned by the `before` hook simply wouldn't be a robust enough solution.
