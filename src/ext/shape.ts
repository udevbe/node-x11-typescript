// http://www.x.org/releases/X11R7.6/doc/xextproto/shape.pdf

// TODO: move to templates

import { XCallback, XClient, XDisplay, XEvent, XExtension, XExtensionInit } from '../xcore'

export interface Shape extends XExtension {
  Kind: {
    Bounding: 0,
    Clip: 1,
    Input: 2
  }

  Op: {
    Set: 0,
    Union: 1,
    Intersect: 2,
    Subtract: 3,
    Invert: 4
  }

  Ordering: {
    Unsorted: 0,
    YSorted: 1,
    YXSorted: 2,
    YXBanded: 3
  }

  QueryVersion: (cb: XCallback<[number, number]>) => void
  Rectangles: (op: number, kind: number, window: number, x: number, y: number, rectangles: [number, number, number, number][], ordering: number /* = Ordering.Unsorted */) => void
  Mask: (op: number, kind: number, window: number, x: number, y: number, bitmap: number) => void
  SelectInput: (window: number, enable: boolean) => void
  InputSelected: (window: number, cb: XCallback<number>) => void
  events: {
    ShapeNotify: 0
  }
}

export interface ShapeNotify extends XEvent {
  type: number
  kind: number
  seq: number
  window: number

  x: number
  y: number
  width: number
  height: number
  time: number
  shaped: number
  name: string
}

export const requireExt: XExtensionInit<Shape> = (display: XDisplay, callback: XCallback<Shape, Error>) => {
  // function captureStack() {
  //   var err = new Error
  //   //err.name = reqName;
  //   Error.captureStackTrace(err, arguments.callee)
  //   display.client.seq2stack[display.client.seq_num] = err.stack
  // }

  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<Shape>('SHAPE', (err, ext) => {
    if (err) {
      return callback(err)
    }

    // @ts-ignore
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    // @ts-ignore
    ext.Kind = {
      Bounding: 0,
      Clip: 1,
      Input: 2
    }

    // @ts-ignore
    ext.Op = {
      Set: 0,
      Union: 1,
      Intersect: 2,
      Subtract: 3,
      Invert: 4
    }

    // @ts-ignore
    ext.Ordering = {
      Unsorted: 0,
      YSorted: 1,
      YXSorted: 2,
      YXBanded: 3
    }

    // @ts-ignore
    ext.QueryVersion = function(cb) {
      X.seqNum++
      // captureStack();
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 0, 1])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('SS'),
        cb
      ]
      X.packStream.flush()
    }

    // Accepts rectangles as [[x, y, width, height]]
    // @ts-ignore
    ext.Rectangles = (op, kind, window, x, y, rectangles, ordering /* = Ordering.Unsorted */) => {
      if (ordering === undefined) {
        // @ts-ignore
        ordering = ext.Ordering.Unsorted
      }

      const length = 4 + rectangles.length * 2

      X.seqNum++
      // captureStack();
      // @ts-ignore
      X.packStream.pack('CCSCCCxLss', [ext.majorOpcode, 1, length, op, kind, ordering, window, x, y])
      for (let i = 0; i < rectangles.length; ++i) {
        const r = rectangles[i]
        X.packStream.pack('ssSS', r)
      }
      X.packStream.flush()
    }

    // @ts-ignore
    ext.Mask = (op, kind, window, x, y, bitmap) => {
      X.seqNum++
// captureStack();
      // @ts-ignore
      X.packStream.pack('CCSCCxxLssL', [ext.majorOpcode, 2, 5, op, kind, window, x, y, bitmap])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.SelectInput = (window, enable) => {
      X.seqNum++
//            captureStack();
      // @ts-ignore
      X.packStream.pack('CCSLCxxx', [ext.majorOpcode, 6, 3, window, enable])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.InputSelected = (window, cb) => {
      X.seqNum++
//            captureStack();
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 7, 2, window])
      X.replies[X.seqNum] = [
        (_: Buffer, opt: number) => opt,
        cb
      ]
      X.packStream.flush()
    }

    /*
    ext.QueryVersion(function(err, version) {
        ext.major = version[0];
        ext.minor = version[1];
        callback(null, ext);
    });
    */

    // @ts-ignore
    ext.events = {
      ShapeNotify: 0
    }

    // @ts-ignore
    X.extraEventParsers[ext.firstEvent + ext.events.ShapeNotify] = (type, seq, extra, code, raw): ShapeNotify => {
      const values = raw.unpack('ssSSLC')
      return {
        type,
        kind: code,
        seq,
        window: extra,
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3],
        time: values[4],
        shaped: values[5],
        name: 'ShapeNotify'
      }
    }

    callback(null, ext)
  })
}
