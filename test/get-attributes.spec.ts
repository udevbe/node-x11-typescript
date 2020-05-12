import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { createClient, XClient, XDisplay } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '80'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('GetWindowAttributes request', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  // keep for a while: this snippet helps to track global leak
  // global.__defineSetter__('a', function(v) {
  //    console.trace();
  // });

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

  it('should work with any kind of attributes too', done => {
    const wid = X.AllocID()
    // @ts-ignore
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1, 0, 0, 0, 0, { overrideRedirect: true }) // 1x1 pixel window
    // @ts-ignore
    X.GetWindowAttributes(wid, (err, prop) => {
      if (err) {
        done(err)
      } else {
        should.exist(prop)
        done()
      }
    })
  })
})
