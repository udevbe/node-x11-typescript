const x11 = require('../src')
const should = require('should')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '81'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('XTEST extension', () => {
  let xvfbProc

  let xDisplay
  let X
  let xtest

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = x11.createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy
        X = xDisplay.client
        X.require('xtest', (err, ext) => {
          should.not.exist(err)
          xtest = ext
          done()
        })
      } else {
        done(err)
      }
    })

    client.on('error', done)
  })

  describe('GetVersion', () => {
    it('should return version 2.2', done => {
      xtest.GetVersion(2, 2, (err, version) => {
        version.should.eql([2, 2])
        done()
      })
    })
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })
})
