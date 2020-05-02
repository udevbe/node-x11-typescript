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

  let client
  let X
  let xPackStreamFlushSpy

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = x11.createClient(connectionOptions, (err, dpy) => {
      should.not.exist(err)
      X = dpy.client
      xPackStreamFlushSpy = sinon.spy(X.pack_stream, 'flush')
      done()
    })

    client.on('error', done)
  })

  afterAll(done => {
    X.pack_stream.flush.restore()
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should be used directly when requesting std atoms with InternAtom', done => {
    X.InternAtom(true, 'WM_NAME', (err, atom) => {
      should.not.exist(err)
      atom.should.equal(X.atoms.WM_NAME)
      sinon.assert.notCalled(xPackStreamFlushSpy)
      done()
    })
  })

  it('should be used directly when requesting atom names with GetAtomName', done => {
    const xGetAtomName1Spy = sinon.spy(X.GetAtomName[1])
    X.GetAtomName(52, (err, atom_name) => {
      should.not.exist(err)
      atom_name.should.equal('UNDERLINE_THICKNESS')
      sinon.assert.notCalled(xGetAtomName1Spy)
      done()
    })
  })

  it('should be used after the first request for non-std atoms', done => {
    X.InternAtom(false, 'My testing atom', (err, atom) => {
      should.not.exist(err)
      sinon.assert.calledOnce(xPackStreamFlushSpy)
      async.parallel(
        [
          cb => {
            X.InternAtom(true, 'My testing atom', cb)
          },
          cb => {
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

  it('should be used after the first request for non-std atom_names', function(done) {
    const self = this
    let my_name
    /*
     * First get an atom defined in the server greater than 68 (WM_TRANSIENT_FOR) and less than 100
     * and not already cached
     */
    let my_atom = 69
    async.until(
      () => (my_name || my_atom > 99),
      cb => {
        if (X.atom_names[my_atom]) {
          return cb()
        }

        X.GetAtomName(my_atom, (err, name) => {
          should.not.exist(err)
          if (name && name !== '') {
            my_name = name
          } else {
            ++my_atom
          }

          cb()
        })
      },
      err => {
        should.not.exist(err)
        should.exist(my_name)
        xPackStreamFlushSpy.resetHistory()
        X.InternAtom(true, my_name, (err, atom) => {
          should.not.exist(err)
          my_atom.should.equal(atom)
          sinon.assert.notCalled(xPackStreamFlushSpy)
          Object.keys(X.pending_atoms).should.be.empty
          done()
        })
      }
    )
  })
})
