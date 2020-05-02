const x11 = require('../src')
const should = require('should')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '99'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

// This test was ported from X Test Suite @ http://cgit.freedesktop.org/xorg/test/xts/

describe('AllowEvents', () => {
  let xvfbProc

  let client
  let X
  let screen
  let wid
  let root

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      screen = dpy.screen[0]
      root = screen.root
      wid = X.AllocID()
      X.CreateWindow(wid,
        root,
        0,
        0,
        screen.pixel_width,
        screen.pixel_height)
      X.MapWindow(wid)
      done()
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

  function warpPointer(wid, x, y, cb) {
    X.QueryPointer(wid, (err, old_pointer) => {
      if (err) {
        return cb(err)
      }

      X.WarpPointer(0,
        wid,
        0,
        0,
        0,
        0,
        x,
        y)

      X.QueryPointer(wid, (err, new_pointer) => {
        if (err) {
          return cb(err)
        }

        cb(undefined, {
          old_x: old_pointer.childX,
          old_y: old_pointer.childY,
          new_x: new_pointer.childX,
          new_y: new_pointer.childY
        })
      })
    })
  }

  function isPointerFrozen(cb) {
    warpPointer(wid, 0, 0, err => {
      if (err) {
        return cb(err)
      }

      warpPointer(wid, 1, 1, (err, data) => {
        if (err) {
          return cb(err)
        }

        cb(undefined, data.old_x === data.new_x)
      })
    })
  }

  it('if pointer is frozen by the client calling AllowEvents with AsyncPointer should resume the processing', done => {
    X.GrabPointer(
      wid,
      false,
      x11.eventMask.PointerMotion,
      0, // sync
      1, // async
      0, // None
      0, // None
      0
    )

    isPointerFrozen((err, frozen) => {
      should.not.exist(err)
      frozen.should.equal(true)
      X.AllowEvents(0, 0)
      isPointerFrozen((err, frozen) => {
        should.not.exist(err)
        frozen.should.equal(false)
        done()
      })
    })
  })
})
