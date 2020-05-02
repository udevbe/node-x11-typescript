const x11 = require('../src')
const assert = require('assert')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '87'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

// keep for a while: this snippet helps to track global leak
global.__defineSetter__('valueName', v => {
  console.trace()
})

describe('Window property', () => {
  let xvfbProc

  let xDisplay
  let X
  let wid

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
        wid = X.AllocID()
        X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 100, 100, 0, 0, 0, 0, { eventMask: x11.eventMask.PropertyChange })
        done()
        client.removeListener('error', done) // all future errors should be attached to corresponding test 'done'
      } else {
        done(err)
      }
    })
    client.on('error', done)
  })

  afterEach(done => {
    X.terminate()
    X.on('end', done)
    X = null
    xDisplay = null
  })

  it('shuld exist after set with ChangeProperty', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
      if (err) return done(err)
      const propvalget = prop.data.toString()
      assert.equal(propvalset, propvalget, 'get property result different from set property value')
      done()
    })
  })

  it('should generate PropertyNotify event', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    X.on('event', ev => {
      if (ev.name === 'PropertyNotify') {
        assert.equal(ev.atom, X.atoms.WM_NAME, 'atom in notification should be same as in ChangeProperty')
        // TODO: replace 0 with X.PropertyNewValue
        assert.equal(ev.state, 0, 'atom in notification should be same as in ChangeProperty')
        assert.equal(ev.wid, wid, 'window in notification should be same as in ChangeProperty')
        done()
        return
      }
      done('unexpexted event')
    })
  })

  it('should not exist after DeleteProperty called', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
      if (err) return done(err)
      const propvalget = prop.data.toString()
      assert.equal(propvalset, propvalget, 'get property result different from set property value')
      X.DeleteProperty(wid, X.atoms.WM_NAME)
      X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
        assert.equal(prop.type, 0, 'non-existent property type should be 0')
        assert.equal(prop.data.length, 0, 'non-existent property data length should be 0')
        done()
      })
    })
  })

  // it('should exist in the ListProperties result after inserted');
  // it('should not exist after GetProperty with delete flag called');
  //it('should not exist after GetProperty with delete flag called', function(done) {
  //    done();
  //});
})
