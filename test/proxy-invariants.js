const scoped = require('../index');

const expect = require('chai').use(require('sinon-chai')).expect;
const sinon = require('sinon');

describe('proxy invariants', function () {
  // Extract the filesView proxy from a scoped plugin invocation
  function getProxy(patterns, files) {
    return new Promise((resolve, reject) => {
      scoped((files) => resolve(files), patterns)(files);
    });
  }

  describe('get', function () {
    it('should truthfully report non-writable, non-configurable data properties', async function () {
      // TODO: test with inheritance? probably not reachable with scoped
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
      expect(proxy).to.have.own.property('answer');
    });
  });

  describe('ownKeys', function () {
    it('should return an array of strings and symbols', async function () {
      const obj = { swallow: 'coconut', larch: 'birch'};
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
      expect(Reflect.ownKeys(proxy)).to.have.all.keys('a', 'b', 'ab');
    });
  });

  describe('getOwnPropertyDescriptor', function () {
    it('should return a valid property descriptor or undefined');

    it('should report existence of non-configurable own properties');

    it('should truthfully report existence or non-existence of own properties of non-extensible objects');

    it('should only report non-configurability when it\'s really there')
  });
});
