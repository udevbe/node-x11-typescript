import * as assert from 'assert'
import { ChildProcessWithoutNullStreams } from "child_process"
import { createClient, XCallback, XDisplay, XError } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '91'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('Client', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let xDisplay: XDisplay

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
        done()
        client.removeListener('error', done)
      } else {
        done(err)
      }
    })
    client.on('error', done)
  })

  afterEach(done => {
    // @ts-ignore
    xDisplay.client.on('end', done)
    // @ts-ignore
    xDisplay.client.terminate()
  })

  it('should respond to ping()', done => {
    // @ts-ignore
    xDisplay.client.ping(done)
  })

  it('should allow to enqueue requests and gracefully execute them before close()', done => {
    let count = 0
    const pong: XCallback<number> = (err) => {
      if (err) return done(err)
      count++
    }
    // @ts-ignore
    xDisplay.client.ping(pong)
    // @ts-ignore
    xDisplay.client.ping(pong)
    // @ts-ignore
    xDisplay.client.ping(pong)
    // @ts-ignore
    xDisplay.client.ping(pong)
    // @ts-ignore
    xDisplay.client.close(err => {
      if (err) return done(err)
      assert.strictEqual(count, 4)
      done()
    })
  })
})
