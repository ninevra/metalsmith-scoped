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

  describe('when reading from the Proxy, out-of-scope files...', function () {
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
  it('should pass through the multimatch options');

});
