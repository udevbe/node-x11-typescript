import { ChildProcessWithoutNullStreams } from "child_process"
import { createClient, XClient, XDisplay } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
import * as assert from 'assert'
import * as should from 'should'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '89'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ForceScreenSaver request', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let xDisplay: XDisplay
  let X: XClient

  beforeAll(async (done) => {
    xvfbProc = await setupXvfb(display, xAuthority)
    done()
  })

  afterAll(done => {
    xvfbProc.kill()
    done()
  })

  beforeEach(done => {
    const client = createClient(testOptions,(err, dpy) => {
      if (!err) {
        xDisplay = dpy as XDisplay
        X = xDisplay.client as XClient
      }

      done(err)
    })
    client.on('error', done)
  })

  afterEach(done => {
    X.terminate()
    X.on('end', done)
  })

  it('should exist as client member', done => {
    should.exist(X.ForceScreenSaver)
    assert.strictEqual(typeof X.ForceScreenSaver, 'function')
    done()
  })

  it('should be callable with true parameter', done => {
    // @ts-ignore
    X.ForceScreenSaver(true)
    // any way to check if it is running?
    done()
  })

  it('should be callable with false parameter', done => {
    // @ts-ignore
    X.ForceScreenSaver(false)
    // any way to check if it is NOT running?
    done()
  })
})
