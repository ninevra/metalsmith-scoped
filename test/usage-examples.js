const Metalsmith = require('metalsmith');
const expect = require('chai').expect;
const markdown = require('metalsmith-markdown');
const scoped = require('../index.js');
const assertDirEqual = require('assert-dir-equal');
const rimraf = require('rimraf');

describe('usage examples', function () {

  beforeEach(function (done) {
    rimraf('test/fixtures/**/build', done);
  });

  after(function (done) {
    rimraf('test/fixtures/**/build', done);
  })

  context('as javascript build script', function () {
    it('should process markdown only in scope', function (done) {
      Metalsmith('test/fixtures/markdown-example/')
        .use(scoped(markdown(), ['index.md', 'index.html']))
        .build((err) => {
          if (err) throw err;
          assertDirEqual(
            'test/fixtures/markdown-example/build',
            'test/fixtures/markdown-example/expected',
            {filter: () => true}
          );
          done();
        });
    });
  });
});
