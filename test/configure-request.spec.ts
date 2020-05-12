import { ChildProcessWithoutNullStreams } from 'child_process'
import { eventMask } from '../src'
import { createClient, XClient } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
import * as should from 'should'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '94'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }


describe('ConfigureRequest', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let X: XClient
  let root: number
  let wid: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      // @ts-ignore
      root = dpy.screen[0].root
      wid = X.AllocID() as number
      /* X acts like a WM */
      // @ts-ignore
      X.ChangeWindowAttributes(root, { eventMask: eventMask.SubstructureRedirect })
      // @ts-ignore
      X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
      // @ts-ignore
      X.QueryTree(root, (err, list) => {
        should.not.exist(err)
        // @ts-ignore
        list.children.indexOf(wid).should.not.equal(-1)
        done()
      })
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll(done => {
    // @ts-ignore
    X.DestroyWindow(wid)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })

  it('should be emitted to the WM if this wid is configured by a client', done => {
    const client = createClient(testOptions, (err, dpy) => {
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

      // @ts-ignore
      dpy.client.MoveResizeWindow(wid, 0, 20, 200, 300)
    })

    client.on('error', done)
  })
})
