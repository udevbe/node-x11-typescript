import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { createClient } from '../src'
import { XCallback, XClient, XDisplay } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '82'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('Client', () => {
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
      if (!err) {
        xDisplay = dpy as XDisplay
        X = xDisplay.client as XClient
        done()
        client.removeListener('error', done)
      } else {
        done(err)
      }
    })
    client.on('error', done)
  })

  afterEach(done => {
    X.terminate()
    X.on('end', done)
  })

  it('should handle more than 65535 requests in one connection', done => {
    should.exist(xDisplay)
    should.exist(xDisplay.screen)
    const total = 70000
    let left = total
    const start = Date.now()

    const test: XCallback<string> = (err, str) => {
      if (err) {
        return done(err)
      }

      if (left === 0) {
        const end = Date.now()
        const dur = end - start
        console.log(total + ' requests finished in ' + dur + ' ms, ' + 1000 * total / dur + ' req/sec')
        return done()
      }
      left--
      // @ts-ignore
      xDisplay.client.GetAtomName(1, test)
    }

    left++
    // @ts-ignore
    test() // first call starts sequens and not a callback from GetAtomName, thus left++
  })
})
