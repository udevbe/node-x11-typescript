const x11 = require('../src')
const should = require('should')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '94'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }


describe('ConfigureRequest', () => {
  let xvfbProc

  let X
  let root
  let wid

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      root = dpy.screen[0].root
      wid = X.AllocID()
      /* X acts like a WM */
      X.ChangeWindowAttributes(root, { eventMask: x11.eventMask.SubstructureRedirect })
      X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
      X.QueryTree(root, (err, list) => {
        should.not.exist(err)
        list.children.indexOf(wid).should.not.equal(-1)
        done()
      })
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll(done => {
    X.DestroyWindow(wid)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })

  it('should be emitted to the WM if this wid is configured by a client', done => {
    const client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X.once('event', ev => {
        ev.name.should.equal('ConfigureRequest')
        ev.x.should.equal(0)
        ev.y.should.equal(20)
        ev.width.should.equal(200)
        ev.height.should.equal(300)
        ev.wid.should.equal(wid)
        done()
      })

      dpy.client.MoveResizeWindow(wid, 0, 20, 200, 300)
    })

    client.on('error', done)
  })
})
