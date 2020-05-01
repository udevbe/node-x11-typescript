const x11 = require('../src')
const should = require('should')

// This test was ported from X Test Suite @ http://cgit.freedesktop.org/xorg/test/xts/

let client
let X
let screen
let wid
let root

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

beforeAll(done => {
  client = x11.createClient((err, dpy) => {
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

describe('AllowEvents', () => {
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

afterAll((done) => {
  X.terminate()
  X.on('end', done)
})
