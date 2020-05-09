// /usr/share/doc/x11proto-composite-dev/compositeproto.txt.gz
// http://cgit.freedesktop.org/xorg/proto/compositeproto/plain/compositeproto.txt
//
// /usr/include/X11/extensions/Xcomposite.h       Xlib
// /usr/include/X11/extensions/composite.h        constants
// /usr/include/X11/extensions/compositeproto.h   structs
//
// http://ktown.kde.org/~fredrik/composite_howto.html
//
// server side source:
//     http://cgit.freedesktop.org/xorg/xserver/tree/composite/compext.c
//

// TODO: move to templates

import { XCallback, XClient, XDisplay, XExtension, XExtensionInit } from '../xcore'

export interface Composite extends XExtension {
  Redirect: {
    Automatic: 0,
    Manual: 1
  }
  QueryVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  RedirectWindow: (window: number, updateType: number) => void
  RedirectSubwindows: (window: number, updateType: number) => void
  UnredirectWindow: (window: number) => void
  UnredirectSubwindows: (window: number) => void
  CreateRegionFromBorderClip: (region: number, window: number) => void
  NameWindowPixmap: (window: number, pixmap: number) => void
  GetOverlayWindow: (window: number, callback: XCallback<number>) => void
  ReleaseOverlayWindow: (window: number) => void
  major: number
  minor: number
}

export const requireExt: XExtensionInit<Composite> = (display: XDisplay, callback: XCallback<Composite, Error>) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<Composite>('Composite', (err, ext: Composite) => {
    if (err) {
      return callback(err)
    }

    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    ext.Redirect = {
      Automatic: 0,
      Manual: 1
    }

    ext.QueryVersion = (clientMaj, clientMin, callback) => {
      X.seqNum++
      X.packStream.pack('CCSLL', [ext.majorOpcode, 0, 3, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('LL'),
        callback
      ]
      X.packStream.flush()
    }

    ext.RedirectWindow = (window, updateType) => {
      X.seqNum++
      X.packStream.pack('CCSLCxxx', [ext.majorOpcode, 1, 3, window, updateType])
      X.packStream.flush()
    }

    ext.RedirectSubwindows = (window, updateType) => {
      X.seqNum++
      X.packStream.pack('CCSLCxxx', [ext.majorOpcode, 2, 3, window, updateType])
      X.packStream.flush()
    }

    ext.UnredirectWindow = window => {
      X.seqNum++
      X.packStream.pack('CCSL', [ext.majorOpcode, 3, 2, window])
      X.packStream.flush()
    }

    ext.UnredirectSubwindows = window => {
      X.seqNum++
      X.packStream.pack('CCSL', [ext.majorOpcode, 4, 2, window])
      X.packStream.flush()
    }

    ext.CreateRegionFromBorderClip = (region, window) => {
      X.seqNum++
      // FIXME bug from original js library
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 5, 3, damage, region])
      X.packStream.flush()
    }

    ext.NameWindowPixmap = (window: number, pixmap: number) => {
      X.seqNum++
      X.packStream.pack('CCSLL', [ext.majorOpcode, 6, 3, window, pixmap])
      X.packStream.flush()
    }

    ext.GetOverlayWindow = (window, callback) => {
      X.seqNum++
      X.packStream.pack('CCSL', [ext.majorOpcode, 7, 2, window])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('L')[0],
        callback
      ]
      X.packStream.flush()
    }

    ext.ReleaseOverlayWindow = window => {
      X.seqNum++
      X.packStream.pack('CCSL', [ext.majorOpcode, 8, 2, window])
      X.packStream.flush()
    }

    // currently version 0.4 TODO: bump up with coordinate translations
    ext.QueryVersion(0, 4, (err, vers) => {
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
