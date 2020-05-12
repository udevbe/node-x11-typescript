import * as assert from 'assert'
import { ChildProcessWithoutNullStreams } from 'child_process'
import { eventMask } from '../src'
import { createClient, XClient, XDisplay } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '87'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

// keep for a while: this snippet helps to track global leak
// global.__defineSetter__('valueName', v => {
//   console.trace()
// })

describe('Window property', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let xDisplay: XDisplay
  let X: XClient
  let wid: number

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
        wid = X.AllocID() as number
        // @ts-ignore
        X.CreateWindow(wid, xDisplay.screen[0].root, 0, 0, 100, 100, 0, 0, 0, 0, { eventMask: eventMask.PropertyChange })
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
  })

  it('shuld exist after set with ChangeProperty', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    // @ts-ignore
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    // @ts-ignore
    X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
      if (err) return done(err)
      // @ts-ignore
      const propvalget = prop.data.toString()
      assert.strictEqual(propvalset, propvalget, 'get property result different from set property value')
      done()
    })
  })

  it('should generate PropertyNotify event', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    // @ts-ignore
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    X.on('event', ev => {
      if (ev.name === 'PropertyNotify') {
        assert.strictEqual(ev.atom, X.atoms.WM_NAME, 'atom in notification should be same as in ChangeProperty')
        // TODO: replace 0 with X.PropertyNewValue
        assert.strictEqual(ev.state, 0, 'atom in notification should be same as in ChangeProperty')
        assert.strictEqual(ev.wid, wid, 'window in notification should be same as in ChangeProperty')
        done()
        return
      }
      done('unexpexted event')
    })
  })

  it('should not exist after DeleteProperty called', done => {
    X.on('error', done)
    const propvalset = 'some property value'
    // @ts-ignore
    X.ChangeProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 8, propvalset)
    // @ts-ignore
    X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
      if (err) return done(err)
      // @ts-ignore
      const propvalget = prop.data.toString()
      assert.strictEqual(propvalset, propvalget, 'get property result different from set property value')
      // @ts-ignore
      X.DeleteProperty(wid, X.atoms.WM_NAME)
      // @ts-ignore
      X.GetProperty(0, wid, X.atoms.WM_NAME, X.atoms.STRING, 0, 10000000, (err, prop) => {
        if(err){
          done(err)
        } else {
          // @ts-ignore
          assert.strictEqual(prop.type, 0, 'non-existent property type should be 0')
          // @ts-ignore
          assert.strictEqual(prop.data.length, 0, 'non-existent property data length should be 0')
          done()
        }
      })
    })
  })

  // it('should exist in the ListProperties result after inserted');
  // it('should not exist after GetProperty with delete flag called');
  // it('should not exist after GetProperty with delete flag called', function(done) {
  //    done();
  // });
})
