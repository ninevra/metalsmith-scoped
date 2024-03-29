const Metalsmith = require('metalsmith');
const expect = require('chai').expect;
const markdown = require('@metalsmith/markdown');
const scoped = require('../index.js');
const assertDirEqual = require('assert-dir-equal');
const rimraf = require('rimraf');
const { exec } = require('child_process');

describe('usage examples', function () {

  beforeEach(function (done) {
    rimraf('test/fixtures/**/build', done);
  });

  after(function (done) {
    rimraf('test/fixtures/**/build', done);
  });

  context('as javascript build script', function () {
    it('should process markdown only in scope', function (done) {
      Metalsmith('test/fixtures/markdown-example/')
        .source('src')
        .destination('build')
        .use(scoped(
          markdown(),
          ["posts/**/*.md", "index.md", "**/*.html"],
          {dot: true}
        ))
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

  context('as cli configuration markdown.json', function () {
    it('should process markdown only in scope', function (done) {
      exec('npx --no-install metalsmith', {
        cwd: 'test/fixtures/markdown-example'
      }, (error, stdout, stderr) => {
        expect(error).to.be.null;
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
