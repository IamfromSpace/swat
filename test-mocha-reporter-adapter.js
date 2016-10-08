const { run, assertMany } = require('./swat');
const { reporters } = require('mocha');
const { giveToReporter } = require('./mocha_reporter_adapter');

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

run(suites).then(r => giveToReporter(reporters.min)(r)).catch(console.log)
