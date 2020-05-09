import { ChildProcessWithoutNullStreams } from 'child_process'

import * as should from 'should'
import { createClient } from '../src'
import { XClient } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '97'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }


describe('requiring an X11 extension on same connection', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let client: XClient
  let X: XClient

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    client = createClient(testOptions, (err, dpy) => {
      should.not.exist(err)
      // @ts-ignore
      X = dpy.client
      done()
    })

    client.on('error', err => {
      console.error('Error : ', err)
    })
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })

  it('should be cached', done => {
    X.require('xtest', (err, randr) => {
      should.not.exist(err)
      X.require('xtest', (err, randr1) => {
        should.not.exist(err)
        if (randr) {
          // @ts-ignore
          randr.should.equal(randr1)
          done()
        }
      })
    })
  })
})
