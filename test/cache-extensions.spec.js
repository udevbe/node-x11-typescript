const x11 = require('../src')
const should = require('should')

let client
let X

beforeAll(done => {
  client = x11.createClient((err, dpy) => {
    should.not.exist(err)
    X = dpy.client
    done()
  })

  client.on('error', err => {
    console.error('Error : ', err)
  })
})

describe('requiring an X11 extension on same connection', () => {
  it('should be cached', done => {
    X.require('xtest', (err, randr) => {
      should.not.exist(err)
      X.require('xtest', (err, randr1) => {
        should.not.exist(err)
        randr.should.equal(randr1)
        done()
      })
    })
  })
})

afterAll(done => {
  X.terminate()
  X.on('end', done)
})
