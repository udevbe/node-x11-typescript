const x11 = require('../src')
const should = require('should')
const assert = require('assert')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '80'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('GetWindowAttributes request', () => {
  let xvfbProc

  // keep for a while: this snippet helps to track global leak
  //global.__defineSetter__('a', function(v) {
  //    console.trace();
  //});

  let xDisplay
  let X

  beforeAll(async (done) => {
    xvfbProc = await setupXvfb(display, xAuthority)
    done()
  })

  afterAll(done => {
    xvfbProc.kill()
    done()
  })

  beforeEach(done => {
    const client = x11.createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy
        X = xDisplay.client
      }

      done(err)
    })
    client.on('error', done)
  })

  afterEach(done => {
    X.terminate()
    X.on('end', done)
    X = null
    xDisplay = null
  })

  it('should work with any kind of attributes too', done => {
    const wid = X.AllocID()
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1, 0, 0, 0, 0, { overrideRedirect: true }) // 1x1 pixel window
    X.GetWindowAttributes(wid, (err, prop) => {
      should.exist(prop)
      done()
    })
  })
})
