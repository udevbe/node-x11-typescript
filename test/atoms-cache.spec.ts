import { PackStream } from '../src/unpackstream'
import { XClient } from '../src/xcore'

const x11 = require('../src')
const should = require('should')
const sinon = require('sinon')
const async = require('async')

const setupXvfb = require('./setupXvfb')
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '98'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const connectionOptions = { display, xAuthority }

describe('Atoms and atom names cache', () => {
  let xvfbProc

  let client: XClient
  let X: XClient
  let xPackStreamFlushSpy: PackStream

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = x11.createClient(connectionOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      xPackStreamFlushSpy = sinon.spy(X.packStream, 'flush')
      done()
    })

    client.on('error', done)
  })

  afterAll(done => {
    X.packStream.flush()
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should be used directly when requesting std atoms with InternAtom', done => {
    // FIXME add protocol to XClient type
    // @ts-ignore
    X.InternAtom(true, 'WM_NAME', (err, atom) => {
      should.not.exist(err)
      atom.should.equal(X.atoms.WM_NAME)
      sinon.assert.notCalled(xPackStreamFlushSpy)
      done()
    })
  })

  it('should be used directly when requesting atom names with GetAtomName', done => {
    // FIXME add protocol to XClient type
    // @ts-ignore
    const xGetAtomName1Spy = sinon.spy(X.GetAtomName[1])
    // FIXME add protocol to XClient type
    // @ts-ignore
    X.GetAtomName(52, (err, atomName) => {
      should.not.exist(err)
      atomName.should.equal('UNDERLINE_THICKNESS')
      sinon.assert.notCalled(xGetAtomName1Spy)
      done()
    })
  })

  it('should be used after the first request for non-std atoms', done => {
    // FIXME add protocol to XClient type
    // @ts-ignore
    X.InternAtom(false, 'My testing atom', (err, atom) => {
      should.not.exist(err)
      sinon.assert.calledOnce(xPackStreamFlushSpy)
      async.parallel(
        [
          cb => {
            // FIXME add protocol to XClient type
            // @ts-ignore
            X.InternAtom(true, 'My testing atom', cb)
          },
          cb => {
            // FIXME add protocol to XClient type
            // @ts-ignore
            X.GetAtomName(atom, cb)
          }
        ],
        (err, results) => {
          should.not.exist(err)
          results[0].should.equal(atom)
          results[1].should.equal('My testing atom')
          sinon.assert.calledOnce(xPackStreamFlushSpy)
          done()
        }
      )
    })
  })

  it('should be used after the first request for non-std atom_names', done => {
    let myName
    /*
     * First get an atom defined in the server greater than 68 (WM_TRANSIENT_FOR) and less than 100
     * and not already cached
     */
    let myAtom = 69
    async.until(
      () => (myName || myAtom > 99),
      cb => {
        if (X.atomNames[myAtom]) {
          return cb()
        }

        // FIXME add protocol to XClient type
        // @ts-ignore
        X.GetAtomName(myAtom, (err, name) => {
          should.not.exist(err)
          if (name && name !== '') {
            myName = name
          } else {
            ++myAtom
          }

          cb()
        })
      },
      err => {
        should.not.exist(err)
        should.exist(myName)
        // @ts-ignore
        xPackStreamFlushSpy.resetHistory()
        // FIXME add protocol to XClient type
        // @ts-ignore
        X.InternAtom(true, myName, (err, atom) => {
          should.not.exist(err)
          // @ts-ignore
          myAtom.should.equal(atom)
          sinon.assert.notCalled(xPackStreamFlushSpy)
          // @ts-ignore
          Object.keys(X.pendingAtoms).should.be.empty
          done()
        })
      }
    )
  })
})
