'use strict';

const Old = require('fluture');
const New = require('..');

const config = {leftHeader: 'Old', rightHeader: 'New'};

const noop = () => {};
const compose = (f, g) => x => f(g(x));
const run = m => m.fork(noop, noop);
const plus1 = x => x + 1;
const arr = (T, length) => Array.from({length}, (_, i) => T.of(i));
const fast = (T, x) => T((rej, res) => void setImmediate(res, x));
const slow = (T, x) => T.after(1, x);

module.exports = require('sanctuary-benchmark')(Old, New, config, {

  'def.construct.Future': [
    {}, ({Future}) => Future((rej, res) => res(1))
  ],

  'def.construct.of': [
    {}, ({of}) => of(1)
  ],

  'def.construct.node': [
    {}, ({node}) => node(done => done(null, 1))
  ],

  'def.transform.ap': [
    {}, ({of, ap}) => ap(of(plus1), of(1))
  ],

  'def.transform.map': [
    {}, ({of, map}) => map(plus1, of(1))
  ],

  'def.transform.chain': [
    {}, ({of, chain}) => chain(plus1, of(1))
  ],

  'run.construct.parallel.empty': [
    {}, ({parallel}) => run(parallel(1, []))
  ],

  'run.construct.parallel.small.sequential': [
    {}, ({Future, parallel}) => run(parallel(1, arr(Future, 2)))
  ],

  'run.construct.parallel.small.concurrent': [
    {}, ({Future, parallel}) => run(parallel(2, arr(Future, 2)))
  ],

  'run.construct.parallel.big.sequential': [
    {}, ({Future, parallel}) => run(parallel(1, arr(Future, 100)))
  ],

  'run.construct.parallel.big.concurrent': [
    {}, ({Future, parallel}) => run(parallel(2, arr(Future, 100)))
  ],

  'run.transform.sync.ap': [
    {}, ({of, ap}) => run(ap(of(plus1), of(1)))
  ],

  'run.transform.sync.map': [
    {}, ({of, map}) => run(map(plus1, of(1)))
  ],

  'run.transform.sync.chain.one': [
    {}, ({of, chain}) => run(chain(compose(of, plus1), of(1)))
  ],

  'run.transform.sync.chain.many': [
    {}, ({chain, of}) => {
      const f = compose(of, plus1);
      let m = of(1);
      for(let i = 0; i < 1000; i++) { m = chain(f, m); }
      run(m);
    }
  ],

  'run.transform.async.ap': [
    {defer: true}, ({Future, ap}, [d]) => {
      ap(fast(Future, plus1), fast(Future, 1)).value(() => d.resolve());
    }
  ],

  'run.transform.async.map': [
    {defer: true}, ({Future, map}, [d]) => {
      map(plus1, fast(Future, 1)).value(() => d.resolve());
    }
  ],

  'run.transform.async.chain.one': [
    {defer: true}, ({Future, chain}, [d]) => {
      chain(x => fast(Future, plus1(x)), fast(Future, 1))
      .value(() => d.resolve());
    }
  ],

  'run.transform.async.chain.many': [
    {defer: true}, ({Future, chain}, [d]) => {
      const f = x => fast(Future, plus1(x));
      let m = fast(Future, 1);
      for(let i = 0; i < 1000; i++) { m = chain(f, m); }
      m.value(() => d.resolve());
    }
  ],

  'run.transform.async.race.fast-vs-slow': [
    {defer: true}, ({Future, race}, [d]) => {
      const a = fast(Future, 1);
      const b = slow(Future, 1);
      race(a, b).value(() => d.resolve());
    }
  ],

  'run.transform.async.race.slow-vs-fast': [
    {defer: true}, ({Future, race}, [d]) => {
      const a = slow(Future, 1);
      const b = fast(Future, 1);
      race(a, b).value(() => d.resolve());
    }
  ],

  'run.transform.async.race.slow-vs-slow': [
    {defer: true}, ({Future, race}, [d]) => {
      const a = slow(Future, 1);
      const b = slow(Future, 1);
      race(a, b).value(() => d.resolve());
    }
  ],

});
