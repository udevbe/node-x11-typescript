import * as fs from 'fs'
import * as assert from 'assert'

describe('all extension modules', () => {
  it('should not throw when require\'d', done => {
    const extFolder = __dirname + '/../src/ext'
    fs.readdir(extFolder, (err: (NodeJS.ErrnoException | null), list: string[]) => {
      assert.ifError(err);
      list.forEach(name => import(extFolder + '/' + name));
      done();
    });
  });
})

