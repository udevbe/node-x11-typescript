const x11 = require('../src')
const should = require('should')
const assert = require('assert')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '88'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('KillKlient request', () => {
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
    const client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      xDisplay = dpy
      X = xDisplay.client
      const root = xDisplay.screen[0].root
      const eventMask = x11.eventMask.SubstructureNotify
      X.ChangeWindowAttributes(root, { eventMask: eventMask })
      done()
    })

    client.on('error', done)
  })

  afterEach(done => {
    X.on('end', done)
    X.terminate()
  })

  it('should exist as client member', () => {
    should.exist(X.KillKlient)
    assert.equal(typeof X.KillKlient, 'function')
  })

  it('should terminate other client connection', done => {
    x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      const otherclient = dpy.client
      const wnd = otherclient.AllocID()
      X.once('event', ev => {
        ev.name.should.equal('CreateNotify')
        ev.wid.should.equal(wnd)
        X.KillKlient(wnd)
      })

      otherclient.CreateWindow(wnd, dpy.screen[0].root, 0, 0, 1, 1)
      otherclient.on('end', done)
    })
  })
})
