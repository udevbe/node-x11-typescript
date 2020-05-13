// http://www.x.org/releases/X11R7.6/doc/scrnsaverproto/saver.pdf

import { XCallback, XClient, XDisplay, XEvent, XExtension, XExtensionInit } from '../xcore'

// TODO: move to templates

export interface ScreenSaver extends XExtension {
  QueryVersion: (clientMaj: number, clientMin: number, cb: XCallback<[number, number]>) => void
  State: {
    Off: 0,
    On: 1,
    Disabled: 2
  }
  Kind: {
    Blanked: 0,
    Internal: 1,
    External: 2
  }
  eventMask: {
    Notify: 1,
    Cycle: 2
  }

  QueryInfo: (drawable: number, callback: XCallback<{
    state: number,
    window: number,
    until: number,
    idle: number,
    eventMask: number,
    kind: number,
  }>) => void

  SelectInput: (drawable: number, eventMask: number) => void

  major: number
  minor: number

  events: {
    ScreenSaverNotify: 0
  }

  NotifyState: {
    Off: 0,
    On: 1,
    Cycle: 2
  }
}

export interface ScreenSaverNotify extends XEvent {
  state: number,
  time: number,
  root: number,
  saverWindow: number,
  kind: number,
  forced: number,
  name: string
}

export const requireExt: XExtensionInit<ScreenSaver> = (display: XDisplay, callback: XCallback<ScreenSaver, Error>) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<ScreenSaver>('MIT-SCREEN-SAVER', (err, ext) => {
    if (err) {
      return callback(err)
    }

    // @ts-ignore
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }


    // @ts-ignore
    ext.QueryVersion = (clientMaj, clientMin, cb) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSCCxx', [ext.majorOpcode, 0, 2, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('CC'),
        cb
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.State = {
      Off: 0,
      On: 1,
      Disabled: 2
    }

    // @ts-ignore
    ext.Kind = {
      Blanked: 0,
      Internal: 1,
      External: 2
    }

    // @ts-ignore
    ext.QueryInfo = (drawable, callback) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 1, 2, drawable])
      X.replies[X.seqNum] = [
        function(buf: Buffer, opt: number) {
          const res = buf.unpack('LLLLC')
          return {
            state: opt,
            window: res[0],
            until: res[1],
            idle: res[2],
            eventMask: res[3],
            kind: res[4]
          }
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.eventMask = {
      Notify: 1,
      Cycle: 2
    }

    // @ts-ignore
    ext.SelectInput = (drawable, eventMask) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 2, 3, drawable, eventMask])
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

    // @ts-ignore
    ext.events = {
      ScreenSaverNotify: 0
    }

    // @ts-ignore
    ext.NotifyState = {
      Off: 0,
      On: 1,
      Cycle: 2
    }

    // @ts-ignore
    X.extraEventParsers[ext.firstEvent + ext.events.ScreenSaverNotify] = (type, seq, extra, code, raw): ScreenSaverNotify => {
      const values = raw.unpack('LLCC')
      return {
        type,
        state: code,
        rawData: raw,
        seq,
        time: extra,
        // CCSL = type, code, seq, extra

        root: values[0],
        saverWindow: values[1],
        kind: values[2],
        forced: values[1],
        name: 'ScreenSaverNotify'
      }
    }
  })
}
