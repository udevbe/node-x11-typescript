// http://www.x.org/releases/X11R7.6/doc/fixesproto/fixesproto.txt


import { XCallback, XClient, XDisplay, XEvent, XExtension, XExtensionInit } from '../xcore'

export interface Fixes extends XExtension {
  QueryVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  SaveSetMode: { Insert: 0, Delete: 1 }
  SaveSetTarget: { Nearest: 0, Root: 1 }
  SaveSetMap: { Map: 0, Unmap: 1 }
  ChangeSaveSet: (window: number, mode: number, target: number, map: number) => void
  WindowRegionKind: {
    Bounding: 0,
    Clip: 1
  }
  CreateRegion: (region: number, rects: { x: number, y: number, width: number, height: number }[]) => void
  CreateRegionFromWindow: (region: number, wid: number, kind: number) => void
  DestroyRegion: (region: number) => void
  UnionRegion: (src1: number, src2: number, dst: number) => void
  TranslateRegion: (region: number, dx: number, dy: number) => void
  FetchRegion: (region: number, cb: XCallback<{ extends: Rectangle, rectangles: Rectangle[] }>) => void
  major: number
  minor: number
  events: {
    DamageNotify: 0
  }
}

export interface DamageNotify extends XEvent {
  level: number,
  drawable: number,
  damage: number,
  time: number,
  area: {
    x: number,
    y: number,
    w: number,
    h: number,
  },
  geometry: {
    x: number,
    y: number,
    w: number,
    h: number,
  },
  name: 'DamageNotify'
}

// TODO: move to templates
export type Rectangle = { x: number, y: number, width: number, height: number }

function parse_rectangle(buf: number[], pos?: number): Rectangle {
  if (!pos) {
    pos = 0
  }

  return {
    x: buf[pos],
    y: buf[pos + 1],
    width: buf[pos + 2],
    height: buf[pos + 3]
  }
}

export const requireExt: XExtensionInit<Fixes> = (display: XDisplay, callback: XCallback<Fixes, Error>) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<Fixes>('XFIXES', function(err, ext) {
    if (err) {
      return callback(err)
    }

    // @ts-ignore
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    // @ts-ignore
    ext.QueryVersion = function(clientMaj, clientMin, callback) {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 0, 3, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('LL'),
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.SaveSetMode = { Insert: 0, Delete: 1 }
    // @ts-ignore
    ext.SaveSetTarget = { Nearest: 0, Root: 1 }
    // @ts-ignore
    ext.SaveSetMap = { Map: 0, Unmap: 1 }

    // @ts-ignore
    ext.ChangeSaveSet = (window, mode, target, map) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSCCxL', [ext.majorOpcode, 1, 3, mode, target, map])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.WindowRegionKind = {
      Bounding: 0,
      Clip: 1
    }

    // @ts-ignore
    ext.CreateRegion = (region, rects) => {
      X.seqNum++
      let format = 'CCSL'
      format += Array(rects.length + 1).join('ssSS')
      // @ts-ignore
      const args = [ext.majorOpcode, 5, 2 + (rects.length << 1), region]
      rects.forEach(rect => {
        args.push(rect.x)
        args.push(rect.y)
        args.push(rect.width)
        args.push(rect.height)
      })

      X.packStream.pack(format, args)
      X.packStream.flush()
    }

    // @ts-ignore
    ext.CreateRegionFromWindow = (region, wid, kind) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLCxxx', [ext.majorOpcode, 7, 4, region, wid, kind])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.DestroyRegion = region => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 10, 2, region])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.UnionRegion = (src1, src2, dst) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLL', [ext.majorOpcode, 13, 4, src1, src2, dst])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.TranslateRegion = (region, dx, dy) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLss', [ext.majorOpcode, 17, 3, region, dx, dy])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.FetchRegion = function(region, cb) {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 19, 2, region])
      X.replies[X.seqNum] = [
        function(buf: Buffer) {
          const nRectangles = (buf.length - 24) >> 3
          let format = 'ssSSxxxxxxxxxxxxxxxx'
          format += Array(nRectangles + 1).join('ssSS')
          const res = buf.unpack(format)
          const reg: { extends: Rectangle, rectangles: Rectangle[] } = {
            extends: parse_rectangle(res),
            rectangles: []
          }

          for (let i = 0; i < nRectangles; ++i) {
            reg.rectangles.push(parse_rectangle(res, 4 + (i << 2)))
          }

          return reg
        },
        cb
      ]

      X.packStream.flush()
    }

    // @ts-ignore
    ext.QueryVersion(5, 0, (err, vers) => {
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
      DamageNotify: 0
    }

    // @ts-ignore
    X.extraEventParsers[ext.firstEvent + ext.events.DamageNotify] = (type: number, seq: number, extra: number, code: number, raw: Buffer): DamageNotify => {
      const values = raw.unpack('LLssSSssSS')
      return {
        type,
        level: code,
        seq: seq,
        drawable: extra,
        damage: values[0],
        time: values[1],
        area: {
          x: values[2],
          y: values[3],
          w: values[4],
          h: values[5]
        },
        geometry: {
          x: values[6],
          y: values[7],
          w: values[8],
          h: values[9]
        },
        name: 'DamageNotify'
      }
    }
  })
}
