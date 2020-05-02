var x11 = require('../src')
var should = require('should')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '86'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }


describe('CreateGC', () => {
  let xvfbProc

  let client
  let X
  let root
  let white
  let black
  let wid

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      root = dpy.screen[0].root
      white = dpy.screen[0].white_pixel
      black = dpy.screen[0].black_pixel
      wid = X.AllocID()
      X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
      X.MapWindow(wid)
      X.QueryTree(root, (err, list) => {
        should.not.exist(err)
        list.children.indexOf(wid).should.not.equal(-1)
        done()
      })
    })
  })

  afterAll(done => {
    X.DestroyWindow(wid)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })

  it('should create a Graphic Context correctly', () => {
    client.on('error', err => {
      should.not.exist(err)
    })

    gc = X.AllocID()
    X.CreateGC(gc,
      wid,
      {
        foreground: black,
        background: white,
        lineStyle: 0
      }
    )
  })
})
