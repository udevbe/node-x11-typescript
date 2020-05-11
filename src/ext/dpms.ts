// http://www.x.org/releases/X11R7.6/doc/xextproto/dpms.txt


import { XCallback, XClient, XDisplay, XExtension, XExtensionInit } from '../xcore'

export interface DPMS extends XExtension {
  GetVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  Capable: (callback: XCallback<any>) => void
  GetTimeouts: (callback: XCallback<[number, number, number]>) => void
  SetTimeouts: (standby: number, suspend: number, off: number) => void
  Enable: () => void
  Disable: () => void
  ForceLevel: (level: 0 | 1 | 2 | 3) => void
  Info: (callback: XCallback<[number, number]>) => void
}

// TODO: move to templates
export const requireExt: XExtensionInit<DPMS> = (display: XDisplay, callback: XCallback<DPMS, Error>) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<DPMS>('DPMS', (err, ext: DPMS) => {
    if (err) {
      return callback(err)
    }
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    ext.GetVersion = (clientMaj, clientMin, callback: XCallback<[number, number]>) => {
      X.seqNum++
      X.packStream.pack('CCSSS', [ext.majorOpcode, 0, 2, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer): number[] => buf.unpack('SS'),
        callback
      ]
      X.packStream.flush()
    }

    ext.Capable = (callback: XCallback<[number]>) => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 1, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('C'),
        callback
      ]
      X.packStream.flush()
    }

    ext.GetTimeouts = (callback: XCallback<[number, number, number]>) => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 2, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('SSS'),
        callback
      ]
      X.packStream.flush()
    }

    ext.SetTimeouts = (standby, suspend, off) => {
      X.seqNum++
      X.packStream.pack('CCSSSSxx', [ext.majorOpcode, 3, 3, standby, suspend, off])
      X.packStream.flush()
    }

    ext.Enable = () => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 4, 1])
      X.packStream.flush()
    }

    ext.Disable = () => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 5, 1])
      X.packStream.flush()
    }

    ext.ForceLevel = (level) => // 0 : On, 1 : Standby, 2 : Suspend, 3 : Off
    {
      X.seqNum++
      X.packStream.pack('CCSSxx', [ext.majorOpcode, 6, 2, level])
      X.packStream.flush()
    }

    ext.Info = (callback) => {
      X.seqNum++
      X.packStream.pack('CCS', [ext.majorOpcode, 7, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('SC'),
        callback
      ]
      X.packStream.flush()
    }

    callback(null, ext)
  })
}

