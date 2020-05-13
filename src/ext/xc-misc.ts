// http://www.x.org/releases/X11R7.6/doc/xcmiscproto/xc-misc.pdf

// TODO: move to templates

import { XCallback, XClient, XExtension, XExtensionInit } from '../xcore'

export interface XCMisc extends XExtension {
  QueryVersion: (clientMaj: number, clientMin: number, cb: XCallback<[number, number]>) => void
  GetXIDRange: (cb: XCallback<{
    startId: number,
    count: number
  }>) => void
  GetXIDList: (count: number, cb: XCallback<number[]>) => void
  major: number
  minor: number
}

export const requireExt: XExtensionInit<XCMisc> = (display, callback) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<XCMisc>('XC-MISC', (err, ext) => {
    if (err) {
      return callback(err)
    }

    // @ts-ignore
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    // @ts-ignore
    ext.QueryVersion = (clientMaj: number, clientMin: number, cb: XCallback<[number, number]>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSSS', [ext.majorOpcode, 0, 2, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('SS'),
        cb
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.GetXIDRange = (cb) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCS', [ext.majorOpcode, 1, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const res = buf.unpack('LL')
          return {
            startId: res[0],
            count: res[1]
          }
        },
        cb
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.GetXIDList = (count, cb) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 2, 2, count])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const numIds = buf.unpack('L')[0]
          const res = []
          for (let i = 0; i < numIds; ++i) {
            res.push(buf.unpack('L', 24 + i * 4))
          }
          return res
        },
        cb
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.QueryVersion(1, 1, (err, vers) => {
      if (err) {
        return callback(err)
      }
      // @ts-ignore
      ext.major = vers[0]
      // @ts-ignore
      ext.minor = vers[1]
      callback(null, ext)
    })
  })
}
