import { ChildProcessWithoutNullStreams } from "child_process"
import * as should from 'should'
import * as assert from 'assert'
import { eventMask } from '../src'
import { createClient, XClient, XDisplay } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '90'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('CreateWindow request', () => {
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

  it('should exist as client member', done => {
    should.exist(X.CreateWindow)
    assert.strictEqual(typeof X.CreateWindow, 'function')
    done()
  })

  it('result should present in windows tree', done => {
    const wid = X.AllocID() as number
    // @ts-ignore
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
    // @ts-ignore
    X.QueryTree(xDisplay.screen[0].root, (err, list) => {
      if (err) {
        done(err)
      }
      // @ts-ignore
      const pos = list.children.indexOf(wid)
      assert.notStrictEqual(pos, -1, 'can\'t find created window')
      done()
    })
  })

  it('should work with any kind of attributes too', done => {
    const wid = X.AllocID() as number
    // @ts-ignore
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1, 0, 0, 0, 0, { overrideRedirect: true }) // 1x1 pixel window
    // @ts-ignore
    X.QueryTree(xDisplay.screen[0].root, (err, list) => {
      should.not.exist(err)
      // @ts-ignore
      list.children.should.containEql(wid)
      done()
    })
  })

  it('should emit CreateNotify event when', done => {
    const wid = X.AllocID() as number
    const root = xDisplay.screen[0].root
    // @ts-ignore
    X.ChangeWindowAttributes(root, { eventMask: eventMask.SubstructureNotify })
    X.on('event', ev => {
      switch (ev.name) {
        case 'CreateNotify':
          ev.parent.should.equal(root)
          ev.wid.should.equal(wid)
          ev.x.should.equal(0)
          ev.y.should.equal(0)
          ev.width.should.equal(1)
          ev.height.should.equal(1)
          ev.borderWidth.should.equal(0)
          ev.overrideRedirect.should.equal(false)
          break

        case 'MapNotify':
          ev.event.should.equal(root)
          ev.wid.should.equal(wid)
          ev.overrideRedirect.should.equal(false)
          // @ts-ignore
          X.UnmapWindow(wid)
          break

        case 'UnmapNotify':
          ev.event.should.equal(root)
          ev.wid.should.equal(wid)
          ev.fromConfigure.should.equal(false)
          // @ts-ignore
          X.DestroyWindow(wid)
          break

        case 'DestroyNotify':
          ev.event.should.equal(root)
          ev.wid.should.equal(wid)
          done()
          break
      }
    })

    // @ts-ignore
    X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
    // @ts-ignore
    X.MapWindow(wid)
  })
})
