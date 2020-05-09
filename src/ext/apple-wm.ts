// http://www.xfree86.org/current/AppleWM.3.html
// http://opensource.apple.com/source/X11server/X11server-106.3/Xquartz/xorg-server-1.10.2/hw/xquartz/applewm.c
// /usr/X11/include/X11/extensions/applewm.h

import { Buffer } from 'buffer'
import { XCallback, XDisplay, XEvent, XExtension, XExtensionInit } from '../xcore'
import { paddedLength } from '../xutil'

// TODO: move to templates

/*
#define X_AppleWMFrameGetRect           1
#define X_AppleWMFrameHitTest           2
#define X_AppleWMFrameDraw              3
#define X_AppleWMDisableUpdate          4
#define X_AppleWMReenableUpdate         5
#define X_AppleWMSetWindowMenuCheck     7
#define X_AppleWMSetWindowMenu          11
#define X_AppleWMSendPSN                12
#define X_AppleWMAttachTransient        13
*/


// const event: XEvent = {}
// switch (type) {
//   case ext.firstEvent + ext.events.AppleWMControllerNotify:
//     event.name = 'AppleWMControllerNotify'
//     break
//   case ext.firstEvent + ext.events.AppleWMActivationNotify:
//     event.name = 'AppleWMActivationNotify'
//     break
//   case ext.firstEvent + ext.events.AppleWMPasteboardNotify:
//     event.name = 'AppleWMPasteboardNotify'
//     break
// }
// event.type = code
// event.time = extra
// event.arg = raw.unpack('xxL')[0]
// return event

export interface AppleWMEvent extends XEvent {
  type: number,
  name: 'AppleWMControllerNotify' | 'AppleWMActivationNotify' | 'AppleWMPasteboardNotify'
  time: number
  arg: number
}

export interface AppleWM extends XExtension {
  QueryVersion: (callback: XCallback<number[]>) => void
  FrameRect: {
    Titlebar: 1,
    Tracking: 2,
    Growbox: 3
  }
  // FIXME the reply is probably not correct
  FrameGetRect: (frameClass: number, frameRect: number, ix: number, iy: number, iw: number, ih: number, ox: number, oy: number, ow: number, oh: number, callback: XCallback<{
    x: number,
    y: number,
    w: number,
    h: number
  }>) => void
  FrameHitTest: (frameClass: number, px: number, py: number, ix: number, iy: number, iw: number, ih: number, ox: number, oy: number, ow: number, oh: number, callback: XCallback<number>) => void
  FrameClass: {
    DecorLarge: 1,
    Reserved1: 2,
    Reserved2: 4,
    Reserved3: 8,
    DecorSmall: 16,
    Reserved5: 32,
    Reserved6: 64,
    Reserved8: 128,
    Managed: 32768,
    Transient: 65536,
    Stationary: 131072
  }
  FrameAttr: {
    Active: 1,
    Urgent: 2,
    Title: 4,
    Prelight: 8,
    Shaded: 16,
    CloseBox: 0x100,
    Collapse: 0x200,
    Zoom: 0x400,
    CloseBoxClicked: 0x800,
    CollapseBoxClicked: 0x1000,
    ZoomBoxClicked: 0x2000,
    GrowBox: 0x4000
  }
  FrameDraw: (screen: number, window: number, frameClass: number, attr: number, ix: number, iy: number, iw: number, ih: number, ox: number, oy: number, ow: number, oh: number, title: string) => void
  NotifyMask: {
    Controller: 1,
    Activation: 2,
    Pasteboard: 4,
    All: 7
  }
  SelectInput: (mask: number) => void
  SetFrontProcess: () => void
  WindowLevel: {
    Normal: 0,
    Floating: 1,
    TornOff: 2,
    Dock: 3,
    Desktop: 4
  }
  SetWindowLevel: (window: number, level: number) => void
  CanQuit: (state: number) => void
  SetWindowMenu: (items: string) => void
  SendPSN: (hi: number, lo: number) => void
  AttachTransient: (child: number, parent: number) => void
  events: {
    AppleWMControllerNotify: 0,
    AppleWMActivationNotify: 1,
    AppleWMPasteboardNotify: 2
  }
  EventKind: {
    Controller: {
      MinimizeWindow: 0,
      ZoomWindow: 1,
      CloseWindow: 2,
      BringAllToFront: 3,
      WideWindow: 4,
      HideAll: 5,
      ShowAll: 6,
      WindowMenuItem: 9,
      WindowMenuNotify: 10,
      NextWindow: 11,
      PreviousWindow: 12
    },
    Activation: {
      IsActive: 0,
      IsInactive: 1,
      ReloadPreferences: 2
    },
    Pasteboard: {
      CopyToPasteboard: 0
    }
  }
}

export const requireExt: XExtensionInit<AppleWM> = (display: XDisplay, callback: XCallback<AppleWM, Error>) => {
  const X = display.client
  if (!X) {
    callback(new Error('No client found'))
    return
  }
  X.QueryExtension?.<AppleWM>('Apple-WM', (err, ext) => {
    if (err) {
      return callback(err)
    }
    if (ext && !ext.present) {
      callback(new Error('extension not available'))
    }

    if (ext) {
      ext.QueryVersion = (cb: XCallback<number[]>) => {
        X.seqNum++
        X.packStream.pack('CCS', [ext.majorOpcode, 0, 1])
        X.replies[X.seqNum] = [
          (buf: Buffer) => buf.unpack('SSL'),
          cb
        ]
        X.packStream.flush()
      }

      ext.FrameRect = {
        Titlebar: 1,
        Tracking: 2,
        Growbox: 3
      }

      ext.FrameGetRect = (frameClass, frameRect, ix, iy, iw, ih, ox, oy, ow, oh, cb) => {
        X.seqNum++
        X.packStream.pack('CCSSSSSSSSSSS', [ext.majorOpcode, 1, 6, frameClass, frameRect, ix, iy, iw, ih, ox, oy, ow, oh, cb])
        X.replies[X.seqNum] = [
          (buf: Buffer) => {
            const res = buf.unpack('SSSS')
            return {
              x: res[0],
              y: res[1],
              w: res[2],
              h: res[3]
            }
          },
          cb
        ]
        X.packStream.flush()
      }

      ext.FrameHitTest = (frameClass, px, py, ix, iy, iw, ih, ox, oy, ow, oh, cb) => {
        X.seqNum++
        X.packStream.pack('CCSSxxSSSSSSSSSS', [ext.majorOpcode, 2, 7, frameClass, px, py, ix, iy, iw, ih, ox, oy, ow, oh])
        X.replies[X.seqNum] = [
          (buf: Buffer) => {
            const res = buf.unpack('L')
            return res[0]
          },
          cb
        ]
        X.packStream.flush()
      }


// from /usr/include/Xplugin.h
      ext.FrameClass = {
        DecorLarge: 1,
        Reserved1: 2,
        Reserved2: 4,
        Reserved3: 8,
        DecorSmall: 16,
        Reserved5: 32,
        Reserved6: 64,
        Reserved8: 128,
        Managed: 32768,
        Transient: 65536,
        Stationary: 131072
      }

      ext.FrameAttr = {
        Active: 1,
        Urgent: 2,
        Title: 4,
        Prelight: 8,
        Shaded: 16,
        CloseBox: 0x100,
        Collapse: 0x200,
        Zoom: 0x400,
        CloseBoxClicked: 0x800,
        CollapseBoxClicked: 0x1000,
        ZoomBoxClicked: 0x2000,
        GrowBox: 0x4000
      }

      ext.FrameDraw = (screen, window, frameClass, attr, ix, iy, iw, ih, ox, oy, ow, oh, title) => {
        X.seqNum++
        const titleReqWords = paddedLength(title.length) / 4
        X.packStream.pack('CCSLLSSSSSSSSSSLp', [ext.majorOpcode, 3, 9 + titleReqWords, screen, window, frameClass, attr, ix, iy, iw, ih, ox, oy, ow, oh, title.length, title])
        X.packStream.flush()
      }

      ext.NotifyMask = {
        Controller: 1,
        Activation: 2,
        Pasteboard: 4,
        All: 7
      }

// TODO: decode events
      /*
      #define AppleWMMinimizeWindow           0
      #define AppleWMZoomWindow               1
      #define AppleWMCloseWindow              2
      #define AppleWMBringAllToFront          3
      #define AppleWMHideWindow               4
      #define AppleWMHideAll                  5
      #define AppleWMShowAll                  6
      #define AppleWMWindowMenuItem           9
      #define AppleWMWindowMenuNotify         10
      #define AppleWMNextWindow               11
      #define AppleWMPreviousWindow           12

      #define AppleWMIsActive                 0
      #define AppleWMIsInactive               1
      #define AppleWMReloadPreferences        2

      #define AppleWMCopyToPasteboard         0
      */

      ext.SelectInput = mask => {
        X.seqNum++
        X.packStream.pack('CCSL', [ext.majorOpcode, 6, 2, mask])
        X.packStream.flush()
      }

      ext.SetFrontProcess = () => {
        X.seqNum++
        X.packStream.pack('CCS', [ext.majorOpcode, 8, 1])
        X.packStream.flush()
      }

      ext.WindowLevel = {
        Normal: 0,
        Floating: 1,
        TornOff: 2,
        Dock: 3,
        Desktop: 4
      }

      ext.SetWindowLevel = (window, level) => {
        X.seqNum++
        X.packStream.pack('CCSLL', [ext.majorOpcode, 9, 3, window, level])
        X.packStream.flush()
      }

      ext.CanQuit = state => {
        X.seqNum++
        X.packStream.pack('CCSCxxx', [ext.majorOpcode, 10, 2, state])
        X.packStream.flush()
      }

      // shortcut is single-byte ASCII (optional, 0=no shortcut)
      // items example: [ 'item1', 'some item', ['C', 'item with C shortcut'] ]
      ext.SetWindowMenu = items => {
        // TODO (this was never implemented in the plain js version of this library)
        // const reqlen = 8
        // const extlength = 0
        // items.forEach(i => {
        //
        // })
        throw new Error('not implemented.')
      }

      // https://developer.apple.com
      //    /library/mac/documentation/Carbon/Reference/Process_Manager/Reference/reference.html#//apple_ref/doc/c_ref/ProcessSerialNumber
      ext.SendPSN = (hi, lo) => {
        X.seqNum++
        X.packStream.pack('CCSLL', [ext.majorOpcode, 12, 3, hi, lo])
        X.packStream.flush()
      }

      ext.AttachTransient = (child, parent) => {
        X.seqNum++
        X.packStream.pack('CCSLL', [ext.majorOpcode, 13, 3, child, parent])
        X.packStream.flush()
      }

      /*
ext.QueryVersion(function(err, vers) {
    ext.major = vers[0];
    ext.minor = vers[1];
    ext.patch = vers[2];
    callback(null, ext);
});
*/

      ext.events = {
        AppleWMControllerNotify: 0,
        AppleWMActivationNotify: 1,
        AppleWMPasteboardNotify: 2
      }

      ext.EventKind = {
        Controller: {
          MinimizeWindow: 0,
          ZoomWindow: 1,
          CloseWindow: 2,
          BringAllToFront: 3,
          WideWindow: 4,
          HideAll: 5,
          ShowAll: 6,
          WindowMenuItem: 9,
          WindowMenuNotify: 10,
          NextWindow: 11,
          PreviousWindow: 12
        },
        Activation: {
          IsActive: 0,
          IsInactive: 1,
          ReloadPreferences: 2
        },
        Pasteboard: {
          CopyToPasteboard: 0
        }
      }

      X.extraEventParsers[ext.firstEvent + ext.events.AppleWMControllerNotify] =
        X.extraEventParsers[ext.firstEvent + ext.events.AppleWMActivationNotify] =
          X.extraEventParsers[ext.firstEvent + ext.events.AppleWMPasteboardNotify] = (type: number, seq: number, extra: number, code: number, raw: Buffer): AppleWMEvent => {
            let name: string
            switch (type) {
              case ext.firstEvent + ext.events.AppleWMControllerNotify:
                name = 'AppleWMControllerNotify'
                break
              case ext.firstEvent + ext.events.AppleWMActivationNotify:
                name = 'AppleWMActivationNotify'
                break
              case ext.firstEvent + ext.events.AppleWMPasteboardNotify:
                name = 'AppleWMPasteboardNotify'
                break
              default:
                name = ''
            }
            return {
              seq,
              name: name as 'AppleWMControllerNotify' | 'AppleWMActivationNotify' | 'AppleWMPasteboardNotify',
              type: code,
              time: extra,
              arg: raw.unpack('xxL')[0]
            }
          }

      callback(null, ext)
    }
  })
}
