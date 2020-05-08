import type { ChildProcessWithoutNullStreams } from 'child_process'
import should from 'should'
import { createClient, eventMask } from '../src'
import { XCallback, XClient, XScreen } from '../src/xcore'
import setupXvfb from './setupXvfb'
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '99'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

// This test was ported from X Test Suite @ http://cgit.freedesktop.org/xorg/test/xts/

describe('AllowEvents', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let client: XClient
  let X: XClient
  let screen: XScreen
  let wid: number
  let root: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      if (dpy) {
        X = dpy.client as XClient
        screen = dpy.screen[0]
        root = screen.root
        wid = X.AllocID() as number
        X.CreateWindow?.(wid,
          root,
          0,
          0,
          screen.pixel_width,
          screen.pixel_height)
        X.MapWindow?.(wid)
        done()
      }
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll((done) => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  function warpPointer(wid: number, x: number, y: number, cb: XCallback<{ old_x: number, old_y: number, new_x: number, new_y: number }>) {
    X.QueryPointer?.(wid, (err, oldPointer) => {
      if (err) {
        return cb(err)
      }

      if (oldPointer) {
        X.WarpPointer?.(0,
          wid,
          0,
          0,
          0,
          0,
          x,
          y)

        X.QueryPointer?.(wid, (err, newPointer) => {
          if (err) {
            return cb(err)
          }

          if (newPointer) {
            cb(null, {
              old_x: oldPointer.childX,
              old_y: oldPointer.childY,
              new_x: newPointer.childX,
              new_y: newPointer.childY
            })
          }
        })
      }
    })
  }

  function isPointerFrozen(cb: XCallback<boolean>) {
    warpPointer(wid, 0, 0, err => {
      if (err) {
        return cb(err)
      }

      warpPointer(wid, 1, 1, (err, data) => {
        if (err) {
          return cb(err)
        }

        if (data) {
          cb(null, data.old_x === data.new_x)
        }
      })
    })
  }

  it('if pointer is frozen by the client calling AllowEvents with AsyncPointer should resume the processing', done => {
    X.GrabPointer?.(
      wid,
      false,
      eventMask.PointerMotion,
      0, // sync
      1, // async
      0, // None
      0, // None
      0
    )

    isPointerFrozen((err, frozen) => {
      should.not.exist(err)
      // @ts-ignore
      frozen.should.equal(true)
      X.AllowEvents?.(0, 0)
      isPointerFrozen((err, frozen) => {
        should.not.exist(err)
        // @ts-ignore
        frozen.should.equal(false)
        done()
      })
    })
  })
})
