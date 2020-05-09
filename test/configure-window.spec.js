const x11 = require('../src')
const should = require('should')

const { setupXvfb } = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '93'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ConfigureWindow', () => {
  let xvfbProc

  let X
  let wid
  let wid_helper

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      wid = X.AllocID()
      wid_helper = X.AllocID()
      X.CreateWindow(wid, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      X.CreateWindow(wid_helper, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      X.QueryTree(dpy.screen[0].root, (err, list) => {
        should.not.exist(err)
        list.children.indexOf(wid).should.not.equal(-1)
        list.children.indexOf(wid_helper).should.not.equal(-1)
        X.ChangeWindowAttributes(wid, { eventMask: x11.eventMask.StructureNotify })
        done()
      })
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll(done => {
    X.removeAllListeners('event')
    X.DestroyWindow(wid)
    X.DestroyWindow(wid_helper)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })

  it('should ResizeWindow correctly to 200x300 pixels', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.height.should.equal(300)
      ev.width.should.equal(200)
      done()
    })
    X.ResizeWindow(wid, 200, 300)
  })

  it('should MoveWindow correctly to x: 100, y: 150 pixels', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.x.should.equal(100)
      ev.y.should.equal(150)
      done()
    })
    X.MoveWindow(wid, 100, 150)
  })

  it('should MoveResizeWindow correctly to x: 200, y: 250 and 500x100 pixels', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.x.should.equal(200)
      ev.y.should.equal(250)
      ev.height.should.equal(100)
      ev.width.should.equal(500)
      done()
    })
    X.MoveResizeWindow(wid, 200, 250, 500, 100)
  })

  it('should RaiseWindow correctly', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.aboveSibling.should.equal(wid_helper)
      done()
    })
    X.RaiseWindow(wid)
  })

  it('should LowerWindow correctly', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.aboveSibling.should.equal(0) /* 0 -> no window below this */
      done()
    })
    X.LowerWindow(wid)
  })

  it('should ignore invalid mask values', done => {
    X.once('event', ev => {
      ev.x.should.equal(0)
      done()
    })

    X.ConfigureWindow(wid, { foo: 3, x: 0 }, err => {
      console.log(err)
    })
  })
})
