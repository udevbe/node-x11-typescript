import { ChildProcessWithoutNullStreams } from 'child_process'

import * as should from 'should'
import { createClient } from '../src'
import { XTest } from '../src/ext/xtest'
import { XClient, XDisplay } from '../src/xcore'

import { setupXvfb } from './setupXvfb'
// Make sure to give each test file it's own unique display num to ensure they connect to to their own X server.
const displayNum = '81'
const display = `:${displayNum}`
const xAuthority = `/tmp/.Xauthority-test-Xvfb-${displayNum}`
const testOptions = { display, xAuthority }

describe('XTEST extension', () => {
  let xvfbProc: ChildProcessWithoutNullStreams

  let xDisplay: XDisplay
  let X: XClient
  let xtest: XTest

  beforeAll(async done => {
    xvfbProc = await setupXvfb(display, xAuthority)

    const client = createClient(testOptions, (err, dpy) => {
      if (!err) {
        xDisplay = dpy as XDisplay
        X = xDisplay.client as XClient
        X.require<XTest>('xtest', (err, ext) => {
          should.not.exist(err)
          xtest = ext as XTest
          done()
        })
      } else {
        done(err)
      }
    })

    client.on('error', done)
  })

  describe('GetVersion', () => {
    it('should return version 2.2', done => {
      xtest.GetVersion(2, 2, (err, version) => {
        if (err) {
          throw err
        }
        // @ts-ignore
        version.should.eql([2, 2])
        done()
      })
    })
  })

  afterAll(done => {
    X.terminate()
    X.on('end', done)

    xvfbProc.kill()
  })
})
