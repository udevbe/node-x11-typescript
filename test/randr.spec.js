const x11 = require('../src')
const async = require('async')
const should = require('should')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '83'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('RANDR extension', () => {
  let xvfbProc

  let X
  let screen
  let root
  let randr

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      screen = dpy.screen[0]
      root = screen.root
      X.require('randr', (err, ext) => {
        should.not.exist(err)
        randr = ext
        /* We HAVE to QueryVersion before using it. Otherwise it does not work as expected */
        randr.QueryVersion(1, 2, done)
      })
    })

    client.on('error', done)
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('GetScreenInfo should get same px and mm width and height as in display.screen[0]', done => {
    randr.GetScreenInfo(root, (err, info) => {
      should.not.exist(err)
      const active_screen = info.screens[info.sizeID]
      active_screen.px_width.should.equal(screen.pixel_width)
      active_screen.px_height.should.equal(screen.pixel_height)
      active_screen.mm_width.should.equal(screen.mm_width)
      active_screen.mm_height.should.equal(screen.mm_height)
      done()
    })
  })

  it('GetScreenResources && GetOutputInfo', done => {
    randr.GetScreenResources(root, (err, resources) => {
      should.not.exist(err)
      should.exist(resources)
      async.each(
        resources.outputs,
        (output, cb) => {
          randr.GetOutputInfo(output, 0, (err, info) => {
            should.not.exist(err)
            should.exist(info)
            cb()
          })
        },
        done
      )
    })
  })
})
