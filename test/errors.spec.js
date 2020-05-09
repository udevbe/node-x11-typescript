const x11 = require('../src')
const should = require('should')
const assert = require('assert')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '84'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('Client', () => {
  let xvfbProc

  let xDisplay
  let X

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      xDisplay = dpy
      X = xDisplay.client
      done()
    })
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should emit error which is instance of Error with sequence number corresponding to source request', done => {
    let times = 0
    //id, parentId, x, y, width, height, borderWidth, depth, _class, visual, values
    xDisplay.client.CreateWindow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, {})
    let seq = xDisplay.client.seq_num
    xDisplay.client.on('error', err => {
      switch (++times) {
        case 11:
          xDisplay.client.removeAllListeners('error')
          done()
          break
        default:
          assert.equal(err.constructor, Error)
          assert.equal(seq, err.seq)
          xDisplay.client.CreateWindow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, {}) // should emit error
          seq = xDisplay.client.seq_num
      }
    })
  })
})
