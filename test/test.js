const scoped = require('../index');

const expect = require('chai').use(require('sinon-chai')).expect;
const sinon = require('sinon');

describe('scoped', function () {
  it('should return a function', function () {
    expect(scoped(() => {}, [], {})).to.be.a('function');
  });

  it('should wrap a metalsmith plugin', function (done) {
    const dummy = sinon.stub().callsFake((files, metalsmith, callback) => callback());
    const fakeMetalsmith = {};
    scoped(dummy, [], {})({'file/name': {contents: Buffer.from('text')}}, fakeMetalsmith, function () {
        expect(dummy.calledOnce).to.be.true;
        const args = dummy.getCall(0).args;
        expect(args[1]).to.equal(fakeMetalsmith);
        done();
    });
  });

  describe('when given patterns', function () {
    let testFiles;
    const fakeMetalsmith = {};
    const dummy = sinon.stub().callsFake((files, metalsmith, callback) => callback());

    beforeEach(function () {
      testFiles = {
        'contents/posts/post-0.md': {
          contents: Buffer.from('*hello world*')
        },
        'contents/posts/post-1.html': {
          contents: Buffer.from('<em>hello world</em>')
        },
        'index.md': {
          contents: Buffer.from('# A Sample Website')
        },
        'contents/top-level.html': {
          contents: Buffer.from('Not a post')
        }
      };
      dummy.resetHistory();
    });

    function objectSubset (obj, keys) {
      return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)));
    }

    it('[] should include no files', function (done) {
      scoped(dummy, [], {})(testFiles, fakeMetalsmith, function () {
        expect(dummy.calledOnce).to.be.true;
        const args = dummy.getCall(0).args;
        expect(args[1]).to.equal(fakeMetalsmith);
        expect(args[0]).to.deep.equal({});
        done();
      });
    });
    
    it('["**/*.html"] should include all .html files', function (done) {
      scoped(dummy, ['**/*.html'], {})(testFiles, fakeMetalsmith, function () {
        expect(dummy.calledOnce).to.be.true;
        const [files, ms] = dummy.getCall(0).args;
        expect(ms).to.equal(fakeMetalsmith);
        expect(files).to.have.own.property('contents/posts/post-1.html', testFiles['contents/posts/post-1.html']);
        expect(files).to.deep.equal(objectSubset(testFiles, [
          'contents/posts/post-1.html',
          'contents/top-level.html'
        ]));
        expect(files['index.md']).to.be.undefined;
        expect(files).to.not.have.own.property('contents/posts/post-0.md');
        expect(files).to.not.have.own.property('index.md');
        done();
      });
    });
  });

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
  });
});
