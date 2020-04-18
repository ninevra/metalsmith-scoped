const scoped = require('../index');

const expect = require('chai').use(require('sinon-chai')).expect;
const sinon = require('sinon');

describe('scoped', function () {

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

  function objectSubset (obj, keys) {
    return Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key)));
  }

  it('[] should include no files', function (done) {
    scoped(dummy, [], {})(testFiles, fakeMetalsmith, function () {
      expect(dummy.calledOnce).to.be.true;
      const [files, ms] = dummy.getCall(0).args;
      expect(ms).to.equal(fakeMetalsmith);
      expect(files).to.deep.equal({});
      // test low-level accesses
      for (let file of Object.keys(testFiles)) {
        expect(Reflect.get(files, file)).to.be.undefined;
        expect(Reflect.has(files, file)).to.be.false;
        expect(Reflect.getOwnPropertyDescriptor(files, file)).to.be.undefined;
      }
      expect(Reflect.ownKeys(files)).to.have.lengthOf(0);
      done();
    });
  });

  it('["**/*.html"] should include only all .html files', function (done) {
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
      // test low-level accesses
      var expected = {
        'contents/posts/post-1.html': true,
        'contents/top-level.html': true,
        'contents/posts/post-0.md': false,
        'index.md': false
      };
      for (let file of Object.keys(testFiles)) {
        expect(Reflect.get(files, file)).to.equal(expected[file] ? testFiles[file] : undefined);
        expect(Reflect.has(files, file)).to.equal(expected[file]);
        expect(Reflect.getOwnPropertyDescriptor(files, file)).to.deep.equal(expected[file] ? Reflect.getOwnPropertyDescriptor(testFiles, file) : undefined);
      }
      expect(Reflect.ownKeys(files)).to.deep.equal(Object.keys(expected).filter(k => expected[k]));
      done();
    });
  });

  describe('when reading from the Proxy, out-of-scope files...', function () {

    it('should be hidden from indexing/direct access operations', function () {
      scoped(dummy, ['contents/posts/*'])(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(view['contents/posts/post-0.md']).to.equal(testFiles['contents/posts/post-0.md']);
        expect(view['index.md']).to.be.undefined;
        expect(Reflect.get(view, 'index.md')).to.be.undefined;
      });
    });

    it('should be hidden from iteration', function () {
      scoped(dummy, ['contents/posts/*'])(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        const files = [];
        for (let file in view) {
          files.push(file);
        }
        expect(files).to.have.members([
          'contents/posts/post-1.html',
          'contents/posts/post-0.md'
        ]);
        expect(files).to.not.include('index.md')
          .and.not.include('contents/top-level.html');
      });
    });

    it('should be hidden from getOwnPropertyDescriptor', function () {
      scoped(dummy, ['contents/posts/*'])(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(Object.getOwnPropertyDescriptor(view, 'index.md')).to.be.undefined;
        expect(Object.getOwnPropertyDescriptor(view, 'content/top-level.html')).to.be.undefined;
      });
    });

    it('should be hidden from Object.keys()', function () {
      scoped(dummy, ['contents/posts/*'])(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(Object.keys(view)).to.have.members([
          'contents/posts/post-1.html',
          'contents/posts/post-0.md'
        ]);
        expect(Object.keys(view)).to.not.include('index.md')
          .and.not.include('contents/top-level.html');
      });
    });

    it('should be hidden from the in operator', function () {
      scoped(dummy, ['contents/posts/*'])(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect('index.md' in view).to.be.false;
        expect('contents/top-level.html' in view).to.be.false;
        expect('contents/posts/post-0.md' in view).to.be.true;
      });
    });
  });

  describe('should pass through the multimatch options', function () {
    specify('test noglobstar', function () {
      scoped(dummy, ['**/post*'], {noglobstar: true})(testFiles, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(view).to.be.empty;
      });
    });

    specify('test without dot', function () {
      scoped(dummy, ['*'])({'.dotfile': {}}, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(view).to.be.empty;
      });
    });

    specify('test with dot', function () {
      scoped(dummy, ['*'], {dot: true})({'.dotfile': {}}, fakeMetalsmith, function () {
        const [view] = dummy.getCall(0).args;
        expect(view).to.have.all.keys('.dotfile');
      });
    });
  });
});
