const x11 = require('../src')
const should = require('should')
const assert = require('assert')
const util = require('util')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '92'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('Client', () => {
  let xvfbProc

  let xDisplay

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
        done()
        client.removeListener('error', done)
      } else {
        done(err)
      }
    })

    client.on('error', done)
  })

  afterEach(done => {
    xDisplay.client.on('end', done)
    xDisplay.client.terminate()
  })

  it('calls first createClient parameter with display object', done => {
    should.exist(xDisplay)
    should.exist(xDisplay.screen)
    should.exist(xDisplay.screen[0])
    should.exist(xDisplay.screen[0].root)
    should.exist(xDisplay.major)
    done()
  })

  it('uses display variable from parameter if present ignoring environment $DISPLAY', done => {
    const disp = process.env.DISPLAY
    process.env.DISPLAY = 'BOGUS DISPLAY'
    const client = x11.createClient(testOptions, (err, dpy) => {
      dpy.client.terminate()
      done()
    })
    client.on('error', done)
    process.env.DISPLAY = disp
  })

  it('throws error if $DISPLAY is bogus', done => {
    try {
      assert.throws(() => {
        const client = x11.createClient({ display: 'BOGUS DISPLAY' }, (err, display) => {
          done('Should not reach here')
        })
        client.on('error', err => {
          done()
        })
      }, /Cannot parse display/)
      done()
    } catch (e) {
      done()
    }
  })

  it('returns error when connecting to non existent display', done => {
    let errorCbCalled = false
    const client = x11.createClient({ display: ':666' }, (err, display) => {
      assert(util.isError(err))
      errorCbCalled = true
      done()
    })
    // TODO: stop writing to socket after first error
    client.on('error', () => {
      if (!errorCbCalled)
        done('should not reach here before first done()')
    })
  })
})
