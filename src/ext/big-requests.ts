// http://www.x.org/releases/X11R7.6/doc/bigreqsproto/bigreq.html

import type { XCallback, XDisplay, XExtension, XExtensionInit } from '../xcore'
import { XClient } from '../xcore'

export interface BigRequest extends XExtension {
  Enable(callback: XCallback<any>): void
}

// TODO: move to templates
export const requireExt: XExtensionInit<BigRequest> = (display: XDisplay, callback: XCallback<BigRequest, Error>) => {
  const X = display.client as XClient
  X.QueryExtension?.<BigRequest>('BIG-REQUESTS', (err, ext) => {
    if (err) {
      return callback(err)
    }
    if (ext) {
      if (!ext.present)
        return callback(new Error('extension not available'))
      ext.Enable = (cb: XCallback<any>) => {
        X.seq_num++
        X.pack_stream.pack('CCS', [ext.majorOpcode, 0, 1])
        X.replies[X.seq_num] = [
          (buf: Buffer) => buf.unpack('L')[0],
          cb
        ]
        X.pack_stream.flush()
      }
      callback(null, ext)
    }
  })
}
