const x11 = require('../src')
const should = require('should')
const assert = require('assert')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '90'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('CreateWindow request', () => {
  let xvfbProc

  // keep for a while: this snippet helps to track global leak
  //global.__defineSetter__('a', function(v) {
  //    console.trace();
  //});

  let xDisplay
  let X

  beforeAll(async (done) => {
    xvfbProc = await setupXvfb(display, xAuthority)
    done()
  })

  afterAll(done => {
    xvfbProc.kill()
    done()
  })

  beforeEach(done => {
    const client = x11.createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy
        X = xDisplay.client
      }

      done(err)
    })
    client.on('error', done)
  })

  afterEach(done => {
    X.terminate()
    X.on('end', done)
    X = null
    xDisplay = null
  })

  it('should exist as client member', done => {
    should.exist(X.CreateWindow)
    assert.equal(typeof X.CreateWindow, 'function')
    done()
  })

  it('result should present in windows tree', done => {
    const wid = X.AllocID()
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
    X.QueryTree(xDisplay.screen[0].root, (err, list) => {
      if (err)
        done(err)
      const pos = list.children.indexOf(wid)
      assert.notEqual(pos, -1, 'can\'t find created window')
      done()
    })
  })

  it('should work with any kind of attributes too', done => {
    const wid = X.AllocID()
    X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 1, 1, 0, 0, 0, 0, { overrideRedirect: true }) // 1x1 pixel window
    X.QueryTree(xDisplay.screen[0].root, (err, list) => {
      should.not.exist(err)
      list.children.should.containEql(wid)
      done()
    })
  })

  it('should emit CreateNotify event when', done => {
    const wid = X.AllocID()
    const root = xDisplay.screen[0].root
    X.ChangeWindowAttributes(root, { eventMask: x11.eventMask.SubstructureNotify })
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
          X.UnmapWindow(wid)
          break

        case 'UnmapNotify':
          ev.event.should.equal(root)
          ev.wid.should.equal(wid)
          ev.fromConfigure.should.equal(false)
          X.DestroyWindow(wid)
          break

        case 'DestroyNotify':
          ev.event.should.equal(root)
          ev.wid.should.equal(wid)
          done()
          break
      }
    })

    X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
    X.MapWindow(wid)
  })
})
