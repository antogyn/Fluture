'use strict';

const Future = require('..');
const {task} = require('folktale/concurrency/task');

const noop = () => {};
const plus1 = x => x + 1;

const createTask = x => task(resolver => resolver.resolve(x));
const createFuture = x => Future((rej, res) => res(x));
const consumeTask = m => m.run().listen({onCancelled: noop, onRejected: noop, onResolved: noop});
const consumeFuture = m => m.fork(noop, noop);

const config = {leftHeader: 'Folktale', rightHeader: 'Fluture'};

const left = {
  create: createTask,
  consume: consumeTask,
  one: createTask(1)
};

const right = {
  create: createFuture,
  consume: consumeFuture,
  one: createFuture(1)
};

module.exports = require('sanctuary-benchmark')(left, right, config, {

  'create.construct': [
    {}, ({create}) => create(1)
  ],

  'create.map': [
    {}, ({one}) => one.map(plus1)
  ],

  'create.chain': [
    {}, ({one}) => one.chain(plus1)
  ],

  'consume.noop': [
    {}, ({one, consume}) => consume(one)
  ],

  'consume.map': [
    {}, ({one, consume}) => consume(one.map(plus1))
  ],

  'consume.chain': [
    {}, ({create, consume, one}) => consume(one.chain(x => create(x + 1)))
  ],

});
