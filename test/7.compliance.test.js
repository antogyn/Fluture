import {expect} from 'chai';
import Future from '../index.mjs.js';
import {assertEqual as eq, I, B, noop, STACKSIZE, error, bang} from './util';
import {Functor, Bifunctor, Apply, Applicative, Chain, ChainRec, Monad} from 'fantasy-laws';
import Z from 'sanctuary-type-classes';
import {
  bool,
  constant as _k,
  falsy,
  fn,
  letrec,
  nat,
  number,
  oneof,
  property,
  string
} from 'jsverify';

//  FutureArb :: Arbitrary a -> Arbitrary b -> Arbitrary (Future a b)
var FutureArb = function(larb, rarb){
  var toStr = function(m){ return m.toString() };
  var getLeft = function(m){
    var x;
    m.fork(function(y){ x = y }, function(){ throw error });
    return x;
  };
  var getRight = function(m){
    var x;
    m.fork(function(){ throw error }, function(y){ x = y });
    return x;
  };
  return oneof(
    larb.smap(Future.reject, getLeft, toStr),
    rarb.smap(Future.of, getRight, toStr),
    larb.smap(function(x){ return Future.reject(x).map(I) }, getLeft, toStr),
    rarb.smap(function(x){ return Future.of(x).map(I) }, getLeft, toStr)
  );
};

//  anyFuture :: Arbitrary (Future Any Any)
var {anyFuture} = letrec(function(tie){
  return {
    anyFuture: FutureArb(tie('any'), tie('any')),
    any: oneof(
      number,
      string,
      bool,
      falsy,
      _k(error),
      fn(tie('any')),
      tie('anyFuture')
    )
  };
});

//  _of :: a -> Arbitrary (Future String a)
var _of = function(rarb){
  return FutureArb(string, rarb);
};

//  query :: String -> String
var query = function(x){
  return x + '?';
};

describe('Future Compliance', function(){

  this.slow(200);
  this.timeout(5000);

  var I = function(x){ return x };
  var T = function(x){ return function(f){ return f(x) } };

  var sub3 = function(x){ return x - 3 };
  var mul3 = function(x){ return x * 3 };

  describe('to Fantasy Land', function(){

    var of = function(x){
      return Z.of(Future, x);
    };

    function test(laws, name){
      var args = Array.prototype.slice.call(arguments, 2);
      it(name, laws[name].apply(null, args));
    }

    describe('Functor', function(){
      test(Functor(eq), 'identity', anyFuture);
      test(Functor(eq), 'composition', _of(number), _k(sub3), _k(mul3));
    });

    describe('Bifunctor', function(){
      test(Bifunctor(eq), 'identity', anyFuture);
      test(Bifunctor(eq), 'composition', _of(number), _k(bang), _k(query), _k(sub3), _k(mul3));
    });

    describe('Apply', function(){
      test(Apply(eq), 'composition', _of(_k(sub3)), _of(_k(mul3)), _of(number));
    });

    describe('Applicative', function(){
      test(Applicative(eq, Future), 'identity', _of(number));
      test(Applicative(eq, Future), 'homomorphism', _k(sub3), number);
      test(Applicative(eq, Future), 'interchange', _of(_k(sub3)), number);
    });

    describe('Chain', function(){
      test(Chain(eq), 'associativity', _of(number), _k(B(of)(sub3)), _k(B(of)(mul3)));
    });

    describe('ChainRec', function(){
      test(
        ChainRec(eq, Future),
        'equivalence',
        _k(function(v){ return v < 1 }),
        _k(B(of)(function(v){ return v - 1 })),
        _k(of),
        nat.smap(x => Math.min(x, 100), I)
      );
      it('stack-safety', function(){
        var p = function(v){ return v > (STACKSIZE + 1) };
        var d = of;
        var n = B(of)(function(v){ return v + 1 });
        var a = Z.chainRec(Future, function(l, r, v){ return p(v) ? Z.map(r, d(v)) : Z.map(l, n(v)) }, 0);
        expect(function(){ return a.fork(noop, noop) }).to.not.throw();
      });
    });

    describe('Monad', function(){
      test(Monad(eq, Future), 'leftIdentity', _k(B(of)(sub3)), _of(number));
      test(Monad(eq, Future), 'rightIdentity', anyFuture);
    });

  });

  describe('to Static Land', function(){

    var of = Future.of;
    var ap = Future.ap;
    var map = Future.map;
    var bimap = Future.bimap;
    var chain = Future.chain;
    var chainRec = Future.chainRec;

    var test = function(name, f){
      return property(name, 'number | nat', function(o){ return f(o.value) });
    };

    describe('Functor', function(){
      test('identity', function(x){
        return eq(map(I, of(x)), of(x));
      });
      test('composition', function(x){
        return eq(map(B(sub3)(mul3), of(x)), map(sub3, map(mul3, of(x))));
      });
    });

    describe('Bifunctor', function(){
      test('identity', function(x){
        return eq(bimap(I, I, of(x)), of(x));
      });
      test('composition', function(x){
        return eq(
          bimap(B(sub3)(mul3), B(sub3)(mul3), of(x)),
          bimap(sub3, sub3, bimap(mul3, mul3, of(x)))
        );
      });
    });

    describe('Apply', function(){
      test('composition', function(x){
        return eq(
          ap(ap(map(B, of(sub3)), of(mul3)), of(x)),
          ap(of(sub3), ap(of(mul3), of(x)))
        );
      });
    });

    describe('Applicative', function(){
      test('identity', function(x){
        return eq(ap(of(I), of(x)), of(x));
      });
      test('homomorphism', function(x){
        return eq(ap(of(sub3), of(x)), of(sub3(x)));
      });
      test('interchange', function(x){
        return eq(ap(of(sub3), of(x)), ap(of(T(x)), of(sub3)));
      });
    });

    describe('Chain', function(){
      test('associativity', function(x){
        return eq(
          chain(B(of)(sub3), chain(B(of)(mul3), of(x))),
          chain(function(y){ return chain(B(of)(sub3), B(of)(mul3)(y)) }, of(x))
        );
      });
    });

    describe('ChainRec', function(){

      test('equivalence', function(x){
        var p = function(v){ return v < 1 };
        var d = of;
        var n = B(of)(function(v){ return v - 1 });
        var a = chainRec(function(l, r, v){ return p(v) ? map(r, d(v)) : map(l, n(v)) }, x);
        var b = (function step(v){ return p(v) ? d(v) : chain(step, n(v)) }(x));
        return eq(a, b);
      });

      it('stack-safety', function(){
        var p = function(v){ return v > (STACKSIZE + 1) };
        var d = of;
        var n = B(of)(function(v){ return v + 1 });
        var a = chainRec(function(l, r, v){ return p(v) ? map(r, d(v)) : map(l, n(v)) }, 0);
        expect(function(){ return a.fork(noop, noop) }).to.not.throw();
      });

    });

    describe('Monad', function(){
      test('left identity', function(x){
        return eq(chain(B(of)(sub3), of(x)), B(of)(sub3)(x));
      });
      test('right identity', function(x){
        return eq(chain(of, of(x)), of(x));
      });
    });

  });

});
