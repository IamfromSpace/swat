const { run, assertMany } = require('./swat');

// TEST TESTS/PLAYGROUND

const tests = {
  'returns undefined': () => {},
  test1: () => true,
  test2: () => false,
  test3: () => 'bad',
  test4: () => Promise.resolve(true),
  test5: () => Promise.resolve(false),
}

//Alternate syntax demo, but I think this doesn't look as nice.
//This won't actually work if passed into run.
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
  before: () => { console.log('b-a'); str = 'whaaaaaaa'; },
  after: () => { console.log('a-a'); str = 'whaaaaaaa'; },
  afterEach: () => { console.log('ae-a'); str = 'scramble!'; },
  beforeEach: () => { console.log('be-a'); str = 'a'; },
  test1: () => { console.log('t-a'); return 't' + str; },
  hark: {
    before: () => { console.log('b-b'); str = 'whaaaaaaa'; },
    after: () => { console.log('a-b'); str = 'whaaaaaaa'; },
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

run(beforeEachTests).then(console.log)
