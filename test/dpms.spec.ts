import { ChildProcessWithoutNullStreams } from 'child_process'

import * as should from 'should'
import { DPMS } from '../src/ext/dpms'
import { createClient, XClient, XDisplay } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '85'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

xdescribe('DPMS extension', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let client: XClient
  let X: XClient
  let xDisplay: XDisplay
  let dpms: DPMS

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy as XDisplay
        X = xDisplay.client as XClient
        X.require('dpms', (err, ext) => {
          should.not.exist(err)
          // @ts-ignore
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

    let prevTimeouts: [number, number, number]
    beforeAll(done => {
      dpms.GetTimeouts((err, timeouts) => {
        // @ts-ignore
        prevTimeouts = timeouts
        done(err)
      })
    })

    it('GetTimeouts should return those values', done => {
      dpms.SetTimeouts(110, 110, 110)
      dpms.GetTimeouts((err, timeouts) => {
        if (!err) {
          // @ts-ignore
          timeouts.should.eql([110, 110, 110])
        }
        done(err)
      })
    })

    afterAll(done => {
      dpms.SetTimeouts(prevTimeouts[0], prevTimeouts[1], prevTimeouts[2])
      dpms.GetTimeouts((err, timeouts) => {
        if (!err) {
          // @ts-ignore
          timeouts.should.eql(prevTimeouts)
        }
        done(err)
      })
    })
  })

  describe('Changing status and level of DPMS', () => {
    let prevStatus: number
    let prevLevel: 0 | 1 | 2 | 3
    beforeAll(done => {
      dpms.Info((err, info) => {
        if (err) {
          done(err)
        } else {
          // @ts-ignore
          prevLevel = info[0]
          // @ts-ignore
          prevStatus = info[1]
          done()
        }
      })
    })

    it('Info should return the correct values', done => {
      if (prevStatus === 0) dpms.Enable() // for force level to work dpms must be enabled
      const newLevel = prevLevel === 0 ? 1 : 0
      dpms.ForceLevel(newLevel)
      dpms.Info((err, info) => {
        if (err) {
          done(err)
        } else {
          // @ts-ignore
          info[0].should.equal(newLevel)
          // @ts-ignore
          info[1].should.equal(1)
          done()
        }
      })
    })

    afterAll(done => {
      dpms.ForceLevel(prevLevel)
      if (prevStatus) dpms.Enable()
      else dpms.Disable()
      dpms.Info((err, info) => {
        if (!err) {
          // @ts-ignore
          info[0].should.equal(prevLevel)
          // @ts-ignore
          info[1].should.equal(prevStatus)
        }

        done(err)
      })
    })
  })
})
