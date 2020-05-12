import * as assert from 'assert'
import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { eventMask } from '../src'
import { createClient, XClient, XDisplay } from '../src/xcore'

import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '88'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('KillKlient request', () => {
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
    const client = createClient(testOptions, (err, dpy) => {
      if (err) {
        done(err)
      } else {
        should.not.exist(err)
        xDisplay = dpy as XDisplay
        X = xDisplay.client as XClient
        const root = xDisplay.screen[0].root
        // @ts-ignore
        X.ChangeWindowAttributes(root, { eventMask: eventMask.SubstructureNotify })
        done()
      }
    })

    client.on('error', done)
  })

  afterEach(done => {
    X.on('end', done)
    X.terminate()
  })

  it('should exist as client member', () => {
    should.exist(X.KillClient)
    assert.strictEqual(typeof X.KillClient, 'function')
  })

  it('should terminate other client connection', done => {
    createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      const otherclient = dpy.client as XClient
      const wnd = otherclient.AllocID() as number
      X.once('event', ev => {
        ev.name.should.equal('CreateNotify')
        ev.wid.should.equal(wnd)
        // @ts-ignore
        X.KillClient(wnd)
      })

      // @ts-ignore
      otherclient.CreateWindow(wnd, dpy.screen[0].root, 0, 0, 1, 1)
      otherclient.on('end', done)
    })
  })
})
