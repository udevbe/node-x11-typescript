import { parallel, until } from 'async'
import { ChildProcessWithoutNullStreams } from 'child_process'
import * as should from 'should'
import * as sinon from 'sinon'
import { createClient } from '../src'
import { PackStream } from '../src/unpackstream'
import { XCallback, XClient, XError } from '../src/xcore'
import { setupXvfb } from './setupXvfb'

// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '98'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const connectionOptions = { display, xAuthority }

describe('Atoms and atom names cache', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let client: XClient
  let X: XClient
  let xPackStreamFlushSpy: PackStream

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = createClient(connectionOptions, (err, dpy) => {
      should.not.exist(err)
      if (dpy) {
        X = dpy.client as XClient
        // @ts-ignore
        xPackStreamFlushSpy = sinon.spy(X.packStream, 'flush')
        done()
      }
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
    X.InternAtom(true, 'WM_NAME', (err: XError, atom: number) => {
      should.not.exist(err)
      // @ts-ignore
      atom.should.equal(X.atoms.WM_NAME)
      // @ts-ignore
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
    X.GetAtomName(52, (err: XError, atomName: string) => {
      should.not.exist(err)
      // @ts-ignore
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
      // @ts-ignore
      sinon.assert.calledOnce(xPackStreamFlushSpy)
      // @ts-ignore
      parallel(
        [
          (cb: XCallback<number>) => {
            // FIXME add protocol to XClient type
            // @ts-ignore
            X.InternAtom?.(true, 'My testing atom', cb)
          },
          (cb: XCallback<string>) => {
            // FIXME add protocol to XClient type
            // @ts-ignore
            X.GetAtomName?.(atom, cb)
          }
        ],
        (err: Error, results: [number, string]) => {
          should.not.exist(err)
          // @ts-ignore
          results[0].should.equal(atom)
          // @ts-ignore
          results[1].should.equal('My testing atom')
          // @ts-ignore
          sinon.assert.calledOnce(xPackStreamFlushSpy)
          done()
        }
      )
    })
  })

  it('should be used after the first request for non-std atom_names', done => {
    let myName: string
    /*
     * First get an atom defined in the server greater than 68 (WM_TRANSIENT_FOR) and less than 100
     * and not already cached
     */
    let myAtom = 69
    until(
      // @ts-ignore
      (cb) => {
        if (myName) {
          return cb(null, true)
        } else {
          return cb(null, myAtom > 99)
        }
      },
      (cb) => {
        if (X.atomNames[myAtom]) {
          return cb()
        }

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
      (err) => {
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
          // @ts-ignore
          sinon.assert.notCalled(xPackStreamFlushSpy)
          // @ts-ignore
          // tslint:disable-next-line:no-unused-expression
          Object.keys(X.pendingAtoms).should.be.empty
          done()
        })
      }
    )
  })
})
