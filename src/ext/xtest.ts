// http://www.x.org/releases/X11R7.6/doc/xextproto/xtest.pdf

import { XCallback, XClient, XDisplay, XExtension } from '../xcore'

export interface XTest extends XExtension {
  GetVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  KeyPress: 2
  KeyRelease: 3
  ButtonPress: 4
  ButtonRelease: 5
  MotionNotify: 6
  FakeInput: (type: number, keycode: number, time: number, wid: number, x: number, y: number) => void
}

// TODO: move to templates
exports.requireExt = function(display: XDisplay, callback: XCallback<XTest, Error>) {
  const X: XClient = display.client as XClient
  X.QueryExtension?.<XTest>('XTEST', (err, ext) => {
    if (err) {
      return callback(err)
    }
    if (ext) {
      if (!ext.present) {
        return callback(new Error('extension not available'))
      }

      ext.GetVersion = (clientMaj, clientMin, callback) => {
        X.seqNum++
        X.packStream.pack('CCSCxS', [ext.majorOpcode, 0, 2, clientMaj, clientMin])
        X.replies[X.seqNum] = [
          (buf: Buffer, opt: number) => {
            const res = buf.unpack('S')
            // Major version is in byte 1 of Reply Header
            // Minor version is in the body of the reply
            return [opt, res[0]]
          },
          callback
        ]
        X.packStream.flush()
      }

      ext.KeyPress = 2
      ext.KeyRelease = 3
      ext.ButtonPress = 4
      ext.ButtonRelease = 5
      ext.MotionNotify = 6

      ext.FakeInput = (type, keycode, time, wid, x, y) => {
        X.seqNum++
        X.packStream.pack('CCSCCxxLLxxxxxxxxssxxxxxxxx', [ext.majorOpcode, 2, 9, type, keycode, time, wid, x, y])
        X.packStream.flush()
      }

      callback(null, ext)
    }
  })
}

