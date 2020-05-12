import { ChildProcessWithoutNullStreams } from 'child_process'
import { createClient, XClient, XDisplay } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
import * as assert from 'assert'
import * as should from 'should'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '84'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('Client', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let xDisplay: XDisplay
  let X: XClient

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      xDisplay = dpy as XDisplay
      X = xDisplay.client as XClient
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
    // id, parentId, x, y, width, height, borderWidth, depth, _class, visual, values
    // @ts-ignore
    xDisplay.client.CreateWindow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, {})
    // @ts-ignore
    let seq = xDisplay.client.seqNum
    // @ts-ignore
    xDisplay.client.on('error', err => {
      switch (++times) {
        case 11:
          // @ts-ignore
          xDisplay.client.removeAllListeners('error')
          done()
          break
        default:
          assert.strictEqual(err.constructor, Error)
          assert.strictEqual(seq, err.seq)
          // @ts-ignore
          xDisplay.client.CreateWindow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, {}) // should emit error
          // @ts-ignore
          seq = xDisplay.client.seqNum
      }
    })
  })
})
