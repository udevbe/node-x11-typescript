const x11 = require('../src')
const assert = require('assert')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '91'
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

  it('should respond to ping()', done => {
    xDisplay.client.ping(done)
  })

  it('should allow to enqueue requests and gracefully execute them before close()', done => {
    let count = 0
    const pong = err => {
      if (err) return done(err)
      count++
    }
    xDisplay.client.ping(pong)
    xDisplay.client.ping(pong)
    xDisplay.client.ping(pong)
    xDisplay.client.ping(pong)
    xDisplay.client.close(err => {
      if (err) return done(err)
      assert.equal(count, 4)
      done()
    })
  })
})
