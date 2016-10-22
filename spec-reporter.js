const { green, red } = require('chalk');
const { ROOT_SUITE, PASS, FAIL } = require('./swat.js');

const repeat = s => n => {
  let o = '';
  for (let i = 0; i <= n; i++) {
    o += s;
  }
  return o;
}

const windows = process && process.platform == 'win32';

const SYMBOLS = {
  [PASS]: windows ? '\u221A' : '✓',
  [FAIL]: windows ? '\u00D7' : '✗',
}

const INDENT_SYM = '  ';
const indent = n => string => repeat(INDENT_SYM)(n) + string;

const testToMsg = ({ name, duration, result, error }) => {
  const sym = SYMBOLS[result];
  const time = duration ? ` (${duration.toFixed(1)}ms)` : '';
  const msg = `${sym} ${name}${time}`;
  switch (result) {
    case PASS:
      return green(msg);
    case FAIL:
      return red(msg);
    default: {
      throw new TypeError(`invalid test result! ${toString(duration)}`);
    }
  }
};

const _suiteToMsgs = ({ depth, msgs }, { name, type, tests, suites }) => {
  const nameMsg = type === ROOT_SUITE ? '' : `${indent(depth - 1)(name)}`;
  const testMsgs = tests.map(t => indent(depth)(testToMsg(t)));
  const newMsgs = msgs.concat([nameMsg]).concat(testMsgs);
  return suites.reduce(_suiteToMsgs, { depth: depth + 1, msgs: newMsgs });
};

const suiteToMsgs = suite => _suiteToMsgs({ depth: 0, msgs: [] }, suite).msgs;

module.exports = {
  suiteToMsgs,
  nodeReport: suite => suiteToMsgs(suite).join('\n'),
}
