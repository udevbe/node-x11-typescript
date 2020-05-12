// @ts-ignore
import * as async from 'async'
import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { Randr } from '../src/ext/randr'
import { createClient, XClient, XScreen } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '83'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('RANDR extension', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let X: XClient
  let screen: XScreen
  let root: number
  let randr: Randr

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      // @ts-ignore
      screen = dpy.screen[0]
      root = screen.root
      X.require<Randr>('randr', (err, ext) => {
        should.not.exist(err)
        randr = ext as Randr
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
      // @ts-ignore
      const activeScreen = info.screens[info.sizeID]
      activeScreen.pxWidth.should.equal(screen.pixel_width)
      activeScreen.pxHeight.should.equal(screen.pixel_height)
      activeScreen.mmWidth.should.equal(screen.mm_width)
      activeScreen.mmHeight.should.equal(screen.mm_height)
      done()
    })
  })

  it('GetScreenResources && GetOutputInfo', done => {
    randr.GetScreenResources(root, (err, resources) => {
      should.not.exist(err)
      should.exist(resources)
      async.each(
        // @ts-ignore
        resources.outputs,
        (output: number, cb: () => void) => {
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
