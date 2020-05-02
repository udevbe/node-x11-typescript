const x11 = require('../src')
const should = require('should')
const assert = require('assert')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '89'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ForceScreenSaver request', () => {
  let xvfbProc

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
    const client = x11.createClient(testOptions,(err, dpy) => {
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

  it('should exist as client member', done => {
    should.exist(X.ForceScreenSaver)
    assert.equal(typeof X.ForceScreenSaver, 'function')
    done()
  })

  it('should be callable with true parameter', done => {
    X.ForceScreenSaver(true)
    // any way to check if it is running?
    done()
  })

  it('should be callable with false parameter', done => {
    X.ForceScreenSaver(false)
    // any way to check if it is NOT running?
    done()
  })
})
