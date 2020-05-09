// http://www.x.org/releases/X11R7.6/doc/damageproto/damageproto.txt

// TODO: move to templates

import { XCallback, XClient, XDisplay, XEvent, XExtension, XExtensionInit } from '../xcore'

export interface Damage extends XExtension {
  ReportLevel: {
    RawRectangles: 0,
    DeltaRectangles: 1,
    BoundingBox: 2,
    NonEmpty: 3
  }
  QueryVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  Create: (damage: number, drawable: number, reportlevel: number) => void
  Destroy: (damage: number) => void
  Subtract: (damage: number, repair: number, parts: number) => void
  Add: (damage: number, region: number) => void
  major: number
  minor: number
  events: {
    DamageNotify: 0
  }
}

export interface DamageEvent extends XEvent {
  level: number,
  drawable: number,
  damage: number,
  time: number,
  area: {
    x: number,
    y: number,
    w: number,
    h: number
  },
  geometry: {
    x: number,
    y: number,
    w: number,
    h: number
  },
  name: string
}


export const requireExt: XExtensionInit<Damage> = (display: XDisplay, callback: XCallback<Damage, Error>) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<Damage>('DAMAGE', (err, ext: Damage) => {
    if (err) {
      return callback(err)
    }

    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    ext.ReportLevel = {
      RawRectangles: 0,
      DeltaRectangles: 1,
      BoundingBox: 2,
      NonEmpty: 3
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

    ext.Create = (damage, drawable, reportlevel) => {
      X.seqNum++
      X.packStream.pack('CCSLLCxxx', [ext.majorOpcode, 1, 4, damage, drawable, reportlevel])
      X.packStream.flush()
    }

    ext.Destroy = damage => {
      X.seqNum++
      X.packStream.pack('CCSLL', [ext.majorOpcode, 2, 3, damage])
      X.packStream.flush()
    }

    ext.Subtract = (damage, repair, parts) => {
      X.seqNum++
      X.packStream.pack('CCSLLL', [ext.majorOpcode, 3, 4, damage, repair, parts])
      X.packStream.flush()
    }

    ext.Add = (damage, region) => {
      X.seqNum++
      X.packStream.pack('CCSLL', [ext.majorOpcode, 4, 3, damage, region])
      X.packStream.flush()
    }

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

    ext.events = {
      DamageNotify: 0
    }

    X.extraEventParsers[ext.firstEvent + ext.events.DamageNotify] = (type, seq, extra, code, raw): DamageEvent => {
      const values = raw.unpack('LLssSSssSS')

      return {
        type,
        level: code,
        seq,
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
