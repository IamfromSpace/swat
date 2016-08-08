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
