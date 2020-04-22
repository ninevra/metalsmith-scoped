const scoped = require('../index');

const expect = require('chai').use(require('sinon-chai')).expect;
const sinon = require('sinon');

// These tests attempt to perform edge-case operations on the filesView Proxy,
// to trigger invariant violations if possible. Several interact with systems
// that metalsmith-scoped doesn't ever touch, just in case. The actual
// assertions aren't particularly necessary, as violating an invariant will
// throw a TypeError and fail the test anyway.

describe('proxy invariants', function () {
  // Extract the filesView proxy from a scoped plugin invocation
  function getProxy(patterns, files) {
    return new Promise((resolve, reject) => {
      scoped((files) => resolve(files), patterns)(files);
    });
  }

  describe('get', function () {
    it('should truthfully report non-writable, non-configurable own data properties', async function () {
      const obj = {};
      Object.defineProperty(obj, 'path/to/file', {
        configurable: false,
        writable: false,
        value: 42
      });
      const proxy = await getProxy([], obj);
      expect(proxy['path/to/file']).to.equal(42);
    });

    it('should report undefined for non-configurable accessor properties with undefined [[Get]]', async function () {
      const obj = {};
      const spy = sinon.spy();
      Object.defineProperty(obj, 'path/to/file', {
        configurable: false,
        set: spy
      });
      const proxy = await getProxy(['**/*'], obj);
      proxy['path/to/file'] = 42;
      expect(spy).to.have.been.calledOnceWithExactly(42);
      expect(proxy['path/to/file']).to.be.undefined;
    });
  });

  describe('has', function () {
    it('should return true for non-configurable own properties', async function () {
      const obj = {};
      Object.defineProperty(obj, 'path/to/file', {
        configurable: false,
        value: 42
      });
      const proxy = await getProxy([], obj);
      expect(Reflect.has(proxy, 'path/to/file')).to.be.true;
    });
    it('should return true for own properties of non-extensible objects', async function () {
      const obj = {answer: 42};
      Object.preventExtensions(obj);
      const proxy = await getProxy([], obj);
      expect(Reflect.has(proxy, 'answer')).to.be.true;
    });
  });

  describe('ownKeys', function () {
    it('should return an array of strings and symbols', async function () {
      const obj = { swallow: 'coconut', larch: 'the'};
      obj[Symbol('bridge')] = 'doom';
      const proxy = await getProxy(['*a*'], obj);
      for (let key of Reflect.ownKeys(proxy)) {
        expect(typeof key).to.satisfy((t) => t === 'string' || t === 'symbol');
      }
    });

    it('should include all non-configurable own properties', async function () {
      const obj = {};
      Object.defineProperty(obj, 'path/to/file', {
        configurable: false,
        value: 42
      });
      const proxy = await getProxy([], obj);
      expect(Reflect.ownKeys(proxy)).to.include('path/to/file');
    });

    it('should truthfully report the own properties of non-extensible objects', async function () {
      const obj = {a: 1, b: 2, ab: 3};
      Object.preventExtensions(obj);
      const proxy = await getProxy([], obj);
      expect(Reflect.ownKeys(proxy)).to.have.members(['a', 'b', 'ab']);
    });
  });

  describe('getOwnPropertyDescriptor', function () {
    it('should return a valid property descriptor or undefined', async function () {
      const obj = {a: 1};
      const proxy = await getProxy(['**/*'], obj);
      expect(() => Object.defineProperty({}, 'a', Object.getOwnPropertyDescriptor(proxy, 'a'))).to.not.throw();
      expect(Object.getOwnPropertyDescriptor(proxy, 'b')).to.be.undefined;
    });

    it('should report existence of non-configurable own properties', async function () {
      const obj = {};
      Object.defineProperty(obj, 'swallow', {
        configurable: false,
        value: 'coconut'
      });
      const proxy = await getProxy(['larch'], obj);
      expect(Object.getOwnPropertyDescriptor(proxy, 'swallow')).to.exist;
    });

    it('should truthfully report existence or non-existence of own properties of non-extensible objects', async function () {
      const obj = {a: 1, b: 2, c: 3, d: 4};
      Object.preventExtensions(obj);
      const proxy = await getProxy(['a*', 'b*'], obj);
      expect(Object.getOwnPropertyDescriptor(proxy, 'c')).to.exist;
      expect(Object.getOwnPropertyDescriptor(proxy, 'a')).to.exist;
      expect(Object.getOwnPropertyDescriptor(proxy, 'e')).to.be.undefined;
    });

    it('should only report non-configurability when it\'s really there', async function () {
      const obj = {a: 1};
      Object.defineProperty(obj, 'b', {
        configurable: false,
        value: 2
      });
      const proxy = await getProxy(['*'], obj);
      expect(Object.getOwnPropertyDescriptor(proxy, 'a').configurable).to.be.true;
      expect(Object.getOwnPropertyDescriptor(proxy, 'b').configurable).to.be.false;
    });
  });
});
