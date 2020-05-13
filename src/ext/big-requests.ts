// http://www.x.org/releases/X11R7.6/doc/bigreqsproto/bigreq.html

import type { XCallback, XClient, XDisplay, XExtension, XExtensionInit } from '../xcore'

export interface BigRequest extends XExtension {
  Enable(callback: XCallback<any>): void
}

// TODO: move to templates
export const requireExt: XExtensionInit<BigRequest> = (display, callback) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<BigRequest>('BIG-REQUESTS', (err, ext: BigRequest) => {
    if (err) {
      return callback(err)
    }

    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    ext.Enable = (cb: XCallback<any>) => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 0, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('L')[0],
        cb
      ]
      X.packStream.flush()
    }
    callback(null, ext)
  })
}
