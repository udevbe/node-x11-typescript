const x11 = require('../src')
const should = require('should')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '85'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

xdescribe('DPMS extension', () => {
  let xvfbProc

  let xDisplay
  let X
  let dpms

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = x11.createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy
        X = xDisplay.client
        X.require('dpms', (err, ext) => {
          should.not.exist(err)
          dpms = ext
          done()
        })
      } else {
        done(err)
      }
    })

    client.on('error', done)
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  describe('Setting the DPMS timeouts to specific values', () => {

    let prev_timeouts
    beforeAll(done => {
      dpms.GetTimeouts((err, timeouts) => {
        prev_timeouts = timeouts
        done(err)
      })
    })

    it('GetTimeouts should return those values', done => {
      dpms.SetTimeouts(110, 110, 110)
      dpms.GetTimeouts((err, timeouts) => {
        if (!err) timeouts.should.eql([110, 110, 110])
        done(err)
      })
    })

    afterAll(done => {
      dpms.SetTimeouts(prev_timeouts[0], prev_timeouts[1], prev_timeouts[2])
      dpms.GetTimeouts((err, timeouts) => {
        if (!err) timeouts.should.eql(prev_timeouts)
        done(err)
      })
    })
  })

  describe('Changing status and level of DPMS', () => {
    let prev_status
    let prev_level
    beforeAll(done => {
      dpms.Info((err, info) => {
        if (!err) {
          prev_level = info[0]
          prev_status = info[1]
        }

        done(err)
      })
    })

    it('Info should return the correct values', done => {
      if (prev_status === 0) dpms.Enable() // for force level to work dpms must be enabled
      const new_level = prev_level === 0 ? 1 : 0
      dpms.ForceLevel(new_level)
      dpms.Info((err, info) => {
        if (!err) {
          info[0].should.equal(new_level)
          info[1].should.equal(1)
        }

        done(err)
      })
    })

    afterAll(done => {
      dpms.ForceLevel(prev_level)
      if (prev_status) dpms.Enable()
      else dpms.Disable()
      dpms.Info((err, info) => {
        if (!err) {
          info[0].should.equal(prev_level)
          info[1].should.equal(prev_status)
        }

        done(err)
      })
    })
  })
})
