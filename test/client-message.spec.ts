import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import { createClient, XClient } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '95'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ClientMessage', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  // Used Atoms
  const ATOM: { [key: string]: number } = {}

  // let client
  let X: XClient
  let wid: number

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client as XClient
      wid = X.AllocID() as number
      // @ts-ignore
      X.CreateWindow(wid, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window

      // @ts-ignore
      X.InternAtom(false, 'TEST_ATOM_1', (err, atom) => {
        should.not.exist(err)
        // @ts-ignore
        ATOM['TEST_ATOM_1'] = atom

        done()
      })
    })

    client.on('error', done)
  })

  afterAll(done => {
    // @ts-ignore
    X.DestroyWindow(wid)
    X.on('end', done)
    X.terminate()

    xvfbProc.kill()
  })


  it('should receive client message with format=8', done => {
    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X.once('event', ev => {
        ev.name.should.equal('ClientMessage')
        ev.wid.should.equal(wid)
        ev.message_type.should.equal(ATOM.TEST_ATOM_1)
        ev.data.should.be.an.Array()
        ev.data.length.should.equal(20)
        done()
      })

      const eventData = Buffer.alloc(32)
      eventData.writeInt8(33, 0)                          // Event Type 33 = ClientMessage
      eventData.writeInt8(8, 1)                          // Format
      eventData.writeInt32LE(wid, 4)                 // Window ID
      eventData.writeInt32LE(ATOM.TEST_ATOM_1, 8)         // Message Type

      // @ts-ignore
      dpy.client.SendEvent(wid, false, 0, eventData)
    })

    client.on('error', done)
  })

  it('should receive client message with format=16', done => {
    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X.once('event', ev => {
        ev.name.should.equal('ClientMessage')
        ev.wid.should.equal(wid)
        ev.message_type.should.equal(ATOM.TEST_ATOM_1)
        ev.data.should.be.an.Array()
        ev.data.length.should.equal(10)
        done()
      })

      const eventData = Buffer.alloc(32)
      eventData.writeInt8(33, 0)                          // Event Type 33 = ClientMessage
      eventData.writeInt8(16, 1)                          // Format
      eventData.writeInt32LE(wid, 4)                 // Window ID
      eventData.writeInt32LE(ATOM.TEST_ATOM_1, 8)         // Message Type

      // @ts-ignore
      dpy.client.SendEvent(wid, false, 0, eventData)
    })

    client.on('error', done)
  })

  it('should receive client message with format=32', done => {
    const client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X.once('event', ev => {
        ev.name.should.equal('ClientMessage')
        ev.wid.should.equal(wid)
        ev.message_type.should.equal(ATOM.TEST_ATOM_1)
        ev.data.should.be.an.Array()
        ev.data.length.should.equal(5)
        done()
      })

      const eventData = Buffer.alloc(32)
      eventData.writeInt8(33, 0)                          // Event Type 33 = ClientMessage
      eventData.writeInt8(32, 1)                         // Format
      eventData.writeInt32LE(wid, 4)                 // Window ID
      eventData.writeInt32LE(ATOM.TEST_ATOM_1, 8)         // Message Type

      // @ts-ignore
      dpy.client.SendEvent(wid, false, 0, eventData)
    })

    client.on('error', done)
  })
})
