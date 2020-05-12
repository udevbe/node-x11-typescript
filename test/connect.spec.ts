import * as assert from 'assert'
import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import * as util from 'util'
import { createClient, XDisplay } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '92'
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
      if (err) {
        done(err)
      } else {
        xDisplay = dpy as XDisplay
        done()
        client.removeListener('error', done)
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

  it('calls first createClient parameter with display object', done => {
    should.exist(xDisplay)
    should.exist(xDisplay.screen)
    should.exist(xDisplay.screen[0])
    should.exist(xDisplay.screen[0].root)
    should.exist(xDisplay.major)
    done()
  })

  it('uses display variable from parameter if present ignoring environment $DISPLAY', done => {
    const disp = process.env.DISPLAY
    process.env.DISPLAY = 'BOGUS DISPLAY'
    const client = createClient(testOptions, (err, dpy) => {
      if (err) {
        done(err)
      } else {
        // @ts-ignore
        dpy.client.terminate()
        done()
      }
    })
    client.on('error', done)
    process.env.DISPLAY = disp
  })

  it('throws error if $DISPLAY is bogus', done => {
    try {
      assert.throws(() => {
        const client = createClient({ display: 'BOGUS DISPLAY' }, (err, display) => {
          if (err) {
            done(err)
          } else {
            done('Should not reach here')
          }
        })
        // tslint:disable-next-line:handle-callback-err
        client.on('error', err => {
          done()
        })
      }, /Cannot parse display/)
      done()
    } catch (e) {
      done()
    }
  })

  it('returns error when connecting to non existent display', done => {
    let errorCbCalled = false
    const client = createClient({ display: ':666' }, (err, display) => {
      assert(util.types.isNativeError(err))
      errorCbCalled = true
      done()
    })
    // TODO: stop writing to socket after first error
    client.on('error', () => {
      if (!errorCbCalled) {
        done('should not reach here before first done()')
      }
    })
  })
})
