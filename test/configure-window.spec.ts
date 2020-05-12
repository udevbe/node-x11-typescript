import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { eventMask } from '../src'
import { createClient, XClient, XError } from '../src/xcore'

import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '93'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ConfigureWindow', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let X: XClient
  let wid: number
  let widHelper: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      wid = X.AllocID() as number
      widHelper = X.AllocID() as number
      // @ts-ignore
      X.CreateWindow(wid, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      // @ts-ignore
      X.CreateWindow(widHelper, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      // @ts-ignore
      X.QueryTree(dpy.screen[0].root, (err, list) => {
        should.not.exist(err)
        // @ts-ignore
        list.children.indexOf(wid).should.not.equal(-1)
        // @ts-ignore
        list.children.indexOf(widHelper).should.not.equal(-1)
        // @ts-ignore
        X.ChangeWindowAttributes(wid, { eventMask: eventMask.StructureNotify })
        done()
      })
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll(done => {
    X.removeAllListeners('event')
    // @ts-ignore
    X.DestroyWindow(wid)
    // @ts-ignore
    X.DestroyWindow(widHelper)
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
    // @ts-ignore
    X.ResizeWindow(wid, 200, 300)
  })

  it('should MoveWindow correctly to x: 100, y: 150 pixels', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.x.should.equal(100)
      ev.y.should.equal(150)
      done()
    })
    // @ts-ignore
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
    // @ts-ignore
    X.MoveResizeWindow(wid, 200, 250, 500, 100)
  })

  it('should RaiseWindow correctly', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.aboveSibling.should.equal(widHelper)
      done()
    })
    // @ts-ignore
    X.RaiseWindow(wid)
  })

  it('should LowerWindow correctly', done => {
    X.once('event', ev => {
      ev.type.should.equal(22) /* ConfigureNotify */
      ev.aboveSibling.should.equal(0) /* 0 -> no window below this */
      done()
    })
    // @ts-ignore
    X.LowerWindow(wid)
  })

  it('should ignore invalid mask values', done => {
    X.once('event', ev => {
      ev.x.should.equal(0)
      done()
    })

    // @ts-ignore
    X.ConfigureWindow(wid, { foo: 3, x: 0 }, (err: XError | undefined) => {
      console.log(err)
    })
  })
})
