const x11 = require('../src')
const should = require('should')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '96'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('ChangeProperty', () => {
  let xvfbProc

  const TEST_PROPERTY = 'My Test Property'

  let client
  let X
  let wid
  let wid_helper

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = x11.createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      wid = X.AllocID()
      wid_helper = X.AllocID()
      X.CreateWindow(wid, dpy.screen[0].root, 0, 0, 1, 1) // 1x1 pixel window
      X.QueryTree(dpy.screen[0].root, (err, list) => {
        should.not.exist(err)
        list.children.indexOf(wid).should.not.equal(-1)
        X.ChangeWindowAttributes(wid, { eventMask: x11.eventMask.PropertyChange })
        done()
      })
    })

    client.on('error', done)
  })

  afterAll(done => {
    X.DestroyWindow(wid)
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should add a new WINDOW property with length 1', done => {
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.alloc(4)
      raw.writeUInt32LE(wid, 0)
      X.ChangeProperty(0, wid, atom, X.atoms.WINDOW, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        X.GetProperty(0, wid, atom, X.atoms.WINDOW, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          prop.data.readUInt32LE(0).should.equal(wid)
          done()
        })
      })
    })
  })

  it('should add a new WINDOW property with length 2', done => {
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.from(new Array(8))
      raw.writeUInt32LE(wid, 0)
      raw.writeUInt32LE(wid_helper, 4)
      X.ChangeProperty(0, wid, atom, X.atoms.ATOM, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        X.GetProperty(0, wid, atom, X.atoms.ATOM, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          prop.data.readUInt32LE(0).should.equal(wid)
          prop.data.readUInt32LE(4).should.equal(wid_helper)
          done()
        })
      })
    })
  })

  it('should replace a the WINDOW property with length 0', done => {
    X.InternAtom(false, TEST_PROPERTY, (err, atom) => {
      should.not.exist(err)
      const raw = Buffer.alloc(0)
      X.ChangeProperty(0, wid, atom, X.atoms.WINDOW, 32, raw)
      X.once('event', ev => {
        ev.type.should.equal(28)
        ev.atom.should.equal(atom)
        ev.wid.should.equal(wid)
        X.GetProperty(0, wid, atom, X.atoms.WINDOW, 0, 1000000000, (err, prop) => {
          should.not.exist(err)
          prop.data.length.should.equal(0)
          done()
        })
      })
    })
  })
})

