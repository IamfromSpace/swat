module.exports = (fn, ...lists) => {
  const m = lists.reduce((min, list) => min ? list.length : Math.min(min, list.length)) || 0;
  r = [];
  for(let i = 0; i < m; i++) {
    r.push(fn(...(lists.map(list => list[i]))))
  }
  return r;
}
