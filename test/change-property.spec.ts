import { ChildProcessWithoutNullStreams } from 'child_process'

import * as should from 'should'
import { createClient, eventMask } from '../src'
import { XClient } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '96'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ChangeProperty', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  const TEST_PROPERTY = 'My Test Property'

  let client: XClient
  let X: XClient
  let wid: number
  let widHelper: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      wid = X.AllocID() as number
      widHelper = X.AllocID() as number
      // @ts-ignore
      X.CreateWindow(wid, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      // @ts-ignore
      X.QueryTree(dpy.screen[0].root, (err, list) => {
        should.not.exist(err)
        // @ts-ignore
        list.children.indexOf(wid).should.not.equal(-1)
        // @ts-ignore
        X.ChangeWindowAttributes(wid, { eventMask: eventMask.PropertyChange })
        done()
      })
    })

    client.on('error', done)
  })

  afterAll(done => {
    // @ts-ignore
    X.DestroyWindow(wid)
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should add a new WINDOW property with length 1', done => {
    // @ts-ignore
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.alloc(4)
      raw.writeUInt32LE(wid, 0)
      // @ts-ignore
      X.ChangeProperty(0, wid, atom as number, X.atoms.WINDOW, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        // @ts-ignore
        X.GetProperty(0, wid, atom as number, X.atoms.WINDOW, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          // @ts-ignore
          prop.data.readUInt32LE(0).should.equal(wid)
          done()
        })
      })
    })
  })

  it('should add a new WINDOW property with length 2', done => {
    // @ts-ignore
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.from(new Array(8))
      raw.writeUInt32LE(wid, 0)
      raw.writeUInt32LE(widHelper, 4)
      // @ts-ignore
      X.ChangeProperty(0, wid, atom as number, X.atoms.ATOM, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        // @ts-ignore
        X.GetProperty(0, wid, atom as number, X.atoms.ATOM, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          // @ts-ignore
          prop.data.readUInt32LE(0).should.equal(wid)
          // @ts-ignore
          prop.data.readUInt32LE(4).should.equal(widHelper)
          done()
        })
      })
    })
  })

  it('should replace a the WINDOW property with length 0', done => {
    // @ts-ignore
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.alloc(0)
      // @ts-ignore
      X.ChangeProperty(0, wid, atom as number, X.atoms.WINDOW, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        // @ts-ignore
        X.GetProperty(0, wid, atom as number, X.atoms.WINDOW, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          // @ts-ignore
          prop.data.length.should.equal(0)
          done()
        })
      })
    })
  })
})

