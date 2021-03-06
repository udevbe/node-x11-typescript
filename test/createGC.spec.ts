import { ChildProcessWithoutNullStreams } from "child_process"
import { createClient, XClient } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
import * as should from 'should'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '86'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }


describe('CreateGC', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let client: XClient
  let X: XClient
  let root: number
  let white: number
  let black: number
  let wid: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      // @ts-ignore
      root = dpy.screen[0].root as number
      // @ts-ignore
      white = dpy.screen[0].white_pixel as number
      // @ts-ignore
      black = dpy.screen[0].black_pixel as number
      wid = X.AllocID() as number
      // @ts-ignore
      X.CreateWindow(wid, root, 0, 0, 1, 1) // 1x1 pixel window
      // @ts-ignore
      X.MapWindow(wid)
      // @ts-ignore
      X.QueryTree(root, (err, list) => {
        should.not.exist(err)
        // @ts-ignore
        list.children.indexOf(wid).should.not.equal(-1)
        done()
      })
    })
  })

  afterAll(done => {
    // @ts-ignore
    X.DestroyWindow(wid)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })

  it('should create a Graphic Context correctly', () => {
    client.on('error', err => {
      should.not.exist(err)
    })

    const gc = X.AllocID() as number
    // @ts-ignore
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
