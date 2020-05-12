// full list of event/error/request codes for all extensions:
// http://www.opensource.apple.com/source/X11server/X11server-106.7/kdrive/xorg-server-1.6.5-apple3/dix/protocol.txt

import { ProtocolTemplates, XClient } from './xcore'
import { paddedLength, padded_string } from './xutil'

type ValueMaskValue = { format: string; mask: number }

export type ValueMask = {
  CreateWindow: {
    cursor: ValueMaskValue;
    backingPlanes: ValueMaskValue;
    overrideRedirect: ValueMaskValue;
    backingPixel: ValueMaskValue;
    bitGravity: ValueMaskValue;
    backgroundPixmap: ValueMaskValue;
    borderPixel: ValueMaskValue;
    borderPixmap: ValueMaskValue;
    saveUnder: ValueMaskValue;
    backgroundPixel: ValueMaskValue;
    doNotPropagateMask: ValueMaskValue;
    winGravity: ValueMaskValue;
    backingStore: ValueMaskValue;
    eventMask: ValueMaskValue;
    colormap: ValueMaskValue
  }; CreateGC: {
    clipXOrigin: ValueMaskValue; joinStyle: ValueMaskValue; capStyle: ValueMaskValue; arcMode: ValueMaskValue; subwindowMode: ValueMaskValue; foreground: ValueMaskValue; graphicsExposures: ValueMaskValue; clipMask: ValueMaskValue; dashOffset: ValueMaskValue; lineWidth: ValueMaskValue; dashes: ValueMaskValue; lineStyle: ValueMaskValue; fillRule: ValueMaskValue; background: ValueMaskValue; function: ValueMaskValue; tileStippleYOrigin: ValueMaskValue; tile: ValueMaskValue; fillStyle: ValueMaskValue; stipple: ValueMaskValue; planeMask: ValueMaskValue; clipYOrigin: ValueMaskValue; tileStippleXOrigin: ValueMaskValue; font: ValueMaskValue
  };
  ConfigureWindow: {
    stackMode: ValueMaskValue; sibling: ValueMaskValue; borderWidth: ValueMaskValue; x: ValueMaskValue; width: ValueMaskValue; y: ValueMaskValue; height: ValueMaskValue
  }
}

const valueMask: ValueMask = {
  CreateWindow: {
    backgroundPixmap: {
      mask: 0x00000001,
      format: 'L'
    },
    backgroundPixel: {
      mask: 0x00000002,
      format: 'L'
    },
    borderPixmap: {
      mask: 0x00000004,
      format: 'L'
    },
    borderPixel: {
      mask: 0x00000008,
      format: 'L'
    },
    bitGravity: {
      mask: 0x00000010,
      format: 'Cxxx'
    },
    winGravity: {
      mask: 0x00000020,
      format: 'Cxxx'
    },
    backingStore: {
      mask: 0x00000040,
      format: 'Cxxx'
    },
    backingPlanes: {
      mask: 0x00000080,
      format: 'L'
    },
    backingPixel: {
      mask: 0x00000100,
      format: 'L'
    },
    overrideRedirect: {
      mask: 0x00000200,
      format: 'Cxxx'
    },
    saveUnder: {
      mask: 0x00000400,
      format: 'Cxxx'
    },
    eventMask: {
      mask: 0x00000800,
      format: 'L'
    },
    doNotPropagateMask: {
      mask: 0x00001000,
      format: 'L'
    },
    colormap: {
      mask: 0x00002000,
      format: 'L'
    },
    cursor: {
      mask: 0x00004000,
      format: 'L'
    }
  },
  CreateGC: {
    'function': { // TODO: alias? _function?
      mask: 0x00000001,
      format: 'Cxxx'
    },
    planeMask: {
      mask: 0x00000002,
      format: 'L'
    },
    foreground: {
      mask: 0x00000004,
      format: 'L'
    },
    background: {
      mask: 0x00000008,
      format: 'L'
    },
    lineWidth: {
      mask: 0x00000010,
      format: 'Sxx'
    },
    lineStyle: {
      mask: 0x00000020,
      format: 'Cxxx'
    },
    capStyle: {
      mask: 0x00000040,
      format: 'Cxxx'
    },
    joinStyle: {
      mask: 0x00000080,
      format: 'Cxxx'
    },
    fillStyle: {
      mask: 0x00000100,
      format: 'Cxxx'
    },
    fillRule: {
      mask: 0x00000200,
      format: 'Cxxx'
    },
    tile: {
      mask: 0x00000400,
      format: 'L'
    },
    stipple: {
      mask: 0x00000800,
      format: 'L'
    },
    tileStippleXOrigin: {
      mask: 0x00001000,
      format: 'sxx'
    },
    tileStippleYOrigin: {
      mask: 0x00002000,
      format: 'sxx'
    },
    font: {
      mask: 0x00004000,
      format: 'L'
    },
    subwindowMode: {
      mask: 0x00008000,
      format: 'Cxxx'
    },
    graphicsExposures: {
      mask: 0x00010000,
      format: 'Cxxx'
    },
    clipXOrigin: {
      mask: 0x00020000,
      format: 'Sxx'
    },
    clipYOrigin: {
      mask: 0x00040000,
      format: 'Sxx'
    },
    clipMask: {
      mask: 0x00080000,
      format: 'L'
    },
    dashOffset: {
      mask: 0x00100000,
      format: 'Sxx'
    },
    dashes: {
      mask: 0x00200000,
      format: 'Cxxx'
    },
    arcMode: {
      mask: 0x00400000,
      format: 'Cxxx'
    }
  },
  ConfigureWindow: {
    x: {
      mask: 0x000001,
      format: 'sxx'
    },
    y: {
      mask: 0x000002,
      format: 'sxx'
    },
    width: {
      mask: 0x000004,
      format: 'Sxx'
    },
    height: {
      mask: 0x000008,
      format: 'Sxx'
    },
    borderWidth: {
      mask: 0x000010,
      format: 'Sxx'
    },
    sibling: {
      mask: 0x000020,
      format: 'L'
    },
    stackMode: {
      mask: 0x000040,
      format: 'Cxxx'
    }
  }
}

const valueMaskName: { [key: string]: { [key: number]: string } } = Object.fromEntries(Object.entries(valueMask).map(([req, masks]) => {
  return [req, Object.fromEntries(Object.entries(masks).map(([m, _]) => {
    return [_.mask, m]
  }))]
}))


function packValueMask<T extends keyof ValueMask>(reqname: T, values: Partial<{ [key in keyof ValueMask[T]]: number }>): [string, number, number[]] {
  let bitmask = 0
  const masksList: number[] = []
  let format = ''
  const reqValueMask = valueMask[reqname]
  const reqValueMaskName = valueMaskName[reqname]

  if (!reqValueMask) {
    throw new Error(reqname + ': no value mask description')
  }

  for (let value in values) {
    // @ts-ignore
    const v: ValueMaskValue | undefined = reqValueMask[value]
    if (v) {
      const valueBit = v.mask
      if (!valueBit) {
        throw new Error(reqname + ': incorrect value param ' + value)
      }
      masksList.push(valueBit)
      bitmask |= valueBit
    }
  }

  /* numeric sort */
  masksList.sort((a, b) => a - b)

  const args: number[] = []
  for (let m in masksList) {
    const valueName = reqValueMaskName[masksList[m]]
    // @ts-ignore
    format += reqValueMask[valueName].format
    // @ts-ignore
    args.push(values[valueName])
  }
  return [format, bitmask, args]
}

/*

the way requests are described here

- outgoing request

   1) as function
   client.CreateWindow( params, params ) ->
       req = reqs.CreateWindow[0]( param, param );
       pack_stream.pack(req[0], req[1]);

   2) as array: [format, [opcode, request_length, additional known params]]

   client.MapWindow[0](id) ->
       req = reqs.MwpWindow;
       req[1].push(id);
       pack_stream.pack( req[0], req[1] );

- reply

*/

// @ts-ignore
// @ts-ignore
export const coreRequests: ProtocolTemplates = {
  CreateWindow: [
    // create request packet - function OR format string
    (id: number,
     parentId: number,
     x: number,
     y: number,
     width: number,
     height: number,
     borderWidth = 0,
     depth = 0,
     _class = 0,
     visual = 0,
     values: Partial<Exclude<{ [key in keyof ValueMask['CreateWindow']]: number }, 'id' | 'parentId' | 'x' | 'y' | 'width' | 'height' | 'borderWidth' | 'depth' | '_class' | 'visual'>> = {}) => {
      let format = 'CCSLLssSSSSLL'

      // TODO: slice from function arguments?

      // TODO: the code is a little bit mess
      // additional values need to be packed in the following way:
      // bitmask (bytes #24 to #31 in the packet) - 32 bit indicating what adittional arguments we supply
      // values list (bytes #32 .. #32+4*num_values) in order of corresponding bits TODO: it's actually not 4*num. Some values are 4b ytes, some - 1 byte

      const vals = packValueMask('CreateWindow', values)
      const packetLength = 8 + (values ? vals[2].length : 0)
      let args = [1, depth, packetLength, id, parentId, x, y, width, height, borderWidth, _class, visual]
      format += vals[0]
      args.push(vals[1])
      args = args.concat(vals[2])
      return [format, args]
    }
  ],

  ChangeWindowAttributes: [
    function(wid: number, values: Partial<{ [key in keyof ValueMask['CreateWindow']]: number }>) {
      let format = 'CxSLSxx'
      const vals = packValueMask('CreateWindow', values)
      const packetLength = 3 + (values ? vals[2].length : 0)
      let args = [2, packetLength, wid, vals[1]]
      const valArr = vals[2]
      format += vals[0]
      args = args.concat(valArr)
      return [format, args]
    }
  ],

  GetWindowAttributes: [
    ['CxSL', [3, 2]],
    (buf: Buffer, backingStore: number) => {
      // TODO: change from array to named object fields
      const res = buf.unpack('LSCCLLCCCCLLLS')
      const ret: { [key: string
          ]: number } = { backingStore: backingStore };
      ('visual klass bitGravity winGravity backingPlanes backingPixel' +
        ' saveUnder mapIsInstalled mapState overrideRedirect colormap' +
        ' allEventMasks myEventMasks doNotPropogateMask')
        .split(' ').forEach((field: string, index: number) => {
        ret[field] = res[index]
      })
      return ret
    }
  ],

  DestroyWindow: [
    ['CxSL', [4, 2]]
  ],

  ChangeSaveSet: [
    function(isInsert: boolean, wid: number) {
      return ['CCSL', [6, (isInsert ? 0 : 1), 2, wid]]
    }
  ],

  // wid, newParentId, x, y
  ReparentWindow: [
    ['CxSLLss', [7, 4]]
  ],

  MapWindow: [
    // 8 - opcode, 2 - length, wid added as parameter
    ['CxSL', [8, 2]]
  ],

  UnmapWindow: [
    ['CxSL', [10, 2]]
  ],

  ConfigureWindow: [
    (win: number, options: { stackMode: number, sibling: number; borderWidth: number; x: number; y: number; width: number; height: number }) => {
      const vals = packValueMask('ConfigureWindow', options)
      const format = 'CxSLSxx' + vals[0]
      let args = [12, vals[2].length + 3, win, vals[1]]
      args = args.concat(vals[2])
      return [format, args]
    }
  ],

  ResizeWindow: [
    // @ts-ignore
    (win: number, width: number, height: number) => coreRequests.ConfigureWindow[0](win, {
      width: width,
      height: height
    })
  ],

  MoveWindow: [
    function(win: number, x: number, y: number) {
      // @ts-ignore
      return coreRequests.ConfigureWindow[0](win, { x: x, y: y })
    }
  ],

  MoveResizeWindow: [
    function(win: number, x: number, y: number, width: number, height: number) {
      // @ts-ignore
      return coreRequests.ConfigureWindow[0](win, { x: x, y: y, width: width, height: height })
    }
  ],

  RaiseWindow: [
    function(win: number) {
      // @ts-ignore
      return coreRequests.ConfigureWindow[0](win, { stackMode: 0 })
    }
  ],

  LowerWindow: [
    function(win: number) {
      // @ts-ignore
      return coreRequests.ConfigureWindow[0](win, { stackMode: 1 })
    }
  ],

  QueryTree: [
    ['CxSL', [15, 2]],

    function(buf: Buffer) {
      const res = buf.unpack('LLS')
      const tree: {
        root: number,
        parent: number,
        children: number[]
      } = {
        root: res[0],
        parent: res[1],
        children: []
      }

      for (let i = 0; i < res[2]; ++i) {
        tree.children.push(buf.unpack('L', 24 + i * 4)[0])
      }
      return tree
    }
  ],

  // opcode 16
  InternAtom: [
    function(returnOnlyIfExist: boolean, value: string) {
      const padded = padded_string(value)
      return ['CCSSxxa', [16, returnOnlyIfExist ? 1 : 0, 2 + padded.length / 4, value.length, padded]]
    },

    function(this: XClient, buf: Buffer, seqNum: number) {
      const res = buf.unpack('L')[0]
      const pendingAtom = this.pendingAtoms[seqNum]
      if (!this.atoms[pendingAtom]) {
        this.atoms[pendingAtom] = res
        this.atomNames[res] = pendingAtom
      }

      delete this.pendingAtoms[seqNum]
      return res
    }
  ],

  GetAtomName: [
    ['CxSL', [17, 2]],
    function(this: XClient, buf: Buffer, seqNum: number) {
      const nameLen = buf.unpack('S')[0]
      // Atom value starting from 24th byte in the buffer
      const name = buf.unpackString(nameLen, 24)
      const pendingAtom: string = this.pendingAtoms[seqNum]
      if (!this.atoms[pendingAtom]) {
        // FIXME this is a bug
        // @ts-ignore
        this.atomNames[pendingAtom] = name
        // @ts-ignore
        this.atoms[name] = pendingAtom
      }

      delete this.pendingAtoms[seqNum]
      return name
    }
  ],

  ChangeProperty: [
    // mode: 0 replace, 1 prepend, 2 append
    // format: 8/16/32
    function(mode: 0 | 1 | 2, wid: number, atomName: number, atomType: number, units: 8 | 16 | 32, data: Buffer | string) {
      const padded4 = (data.length + 3) >> 2
      const pad = Buffer.alloc((padded4 << 2) - data.length)
      const format = 'CCSLLLCxxxLaa'
      const requestLength = 6 + padded4
      const dataLenInFormatUnits = data.length / (units >> 3)
      return [format, [18, mode, requestLength, wid, atomName, atomType, units, dataLenInFormatUnits, data, pad]]
    }
  ],

  // TODO: test
  DeleteProperty: [
    function(wid: number, prop: number) {
      return ['CxSLL', [19, 3, wid, prop]]
    }
  ],

  GetProperty: [
    function(del: number, wid: number, name: number, type: number, longOffset: number, longLength: number) //  - offest and maxLength in 4-byte units
    {
      return ['CCSLLLLL', [20, del, 6, wid, name, type, longOffset, longLength]]
    },
    function(buf: Buffer, format: 8 | 16 | 32) {
      const res = buf.unpack('LLL')
      const len = res[2] * (format >> 3)
      return {
        type: res[0],
        bytesAfter: res[1],
        data: buf.slice(24, 24 + len)
      }
    }
  ],

  ListProperties: [
    function(wid: number) {
      return ['CxSL', [21, 2, wid]]
    },

    function(buf: Buffer) {
      const n = buf.unpack('S')[0]
      let i
      const atoms = []
      for (i = 0; i < n; ++i) {
        atoms.push(buf.unpack('L', 24 + 4 * i)[0])
        // console.log([n, i, atoms]);
      }
      return atoms
    }
  ],

  SetSelectionOwner: [
    function(owner: number, selection: number, time = 0) {
      return ['CxSLLL', [22, 4, owner, selection, time]]
    }
  ],

  GetSelectionOwner: [
    function(selection: number) {
      return ['CxSL', [23, 2, selection]]
    },

    function(buf: Buffer) {
      return buf.unpack('L')[0]
    }
  ],

  ConvertSelection: [
    function(requestor: number, selection: number, target: number, property: number, time = 0) {
      return ['CxSLLLLL', [24, 6, requestor, selection, target, property, time]]
    }
  ],

  SendEvent: [
    function(destination: number, propagate: boolean, eventMask: number, eventRawData: Buffer) {
      return ['CCSLLa', [25, propagate, 11, destination, eventMask, eventRawData]]
    }
  ],

  GrabPointer: [
    function(wid: number, ownerEvents: boolean, mask: number, pointerMode: number, keybMode: number, confineTo: number, cursor: number, time: number) {
      return ['CCSLSCCLLL', [26, ownerEvents, 6, wid, mask, pointerMode, keybMode,
        confineTo, cursor, time]]
    },
    function(buf: Buffer, status: number) {
      return status
    }
  ],

  UngrabPointer: [
    function(time: number) {
      return ['CxSL', [27, 2, time]]
    }
  ],

  GrabButton: [
    function(wid: number, ownerEvents: boolean, mask: number, pointerMode: number, keybMode: number, confineTo: number, cursor: number, button: number, modifiers: number) {
      return ['CCSLSCCLLCxS', [28, ownerEvents, 6, wid, mask, pointerMode, keybMode, confineTo,
        cursor, button, modifiers]]
    }
  ],

  UngrabButton: [
    function(wid: number, button: number, modifiers: number) {
      return ['CCSLSxx', [29, button, 3, wid, modifiers]]
    }
  ],

  ChangeActivePointerGrab: [
    function(cursor: number, time: number, mask: number) {
      return ['CxSLLSxx', [30, 4, cursor, time, mask]]
    }
  ],

  GrabKeyboard: [
    function(wid: number, ownerEvents: number, time: number, pointerMode: number, keybMode: number) {
      return ['CCSLLCCxx', [31, ownerEvents, 4, wid, time, pointerMode, keybMode]]
    },
    function(buf: Buffer, status: number) {
      return status
    }
  ],

  UngrabKeyboard: [
    function(time: number) {
      return ['CxSL', [32, 2, time]]
    }
  ],

  GrabKey: [
    function(wid: number, ownerEvents: number, modifiers: number, key: number, pointerMode: number, keybMode: number) {
      return ['CCSLSCCCxxx', [33, ownerEvents, 4, wid, modifiers, key, pointerMode, keybMode]]
    }
  ],

  UngrabKey: [
    function(wid: number, key: number, modifiers: number) {
      return ['CCSLSxx', [34, key, 3, wid, modifiers]]
    }
  ],

  AllowEvents: [
    function(mode: number, ts: number) {
      return ['CCSL', [35, mode, 2, ts]]
    }
  ],

  GrabServer: [
    ['CxS', [36, 1]]
  ],

  UngrabServer: [
    ['CxS', [37, 1]]
  ],

  QueryPointer: [
    ['CxSL', [38, 2]],
    function(buf: Buffer, sameScreen: number) {
      const res = buf.unpack('LLssssS')
      return {
        root: res[0],
        child: res[1],
        rootX: res[2],
        rootY: res[3],
        childX: res[4],
        childY: res[5],
        keyMask: res[6],
        sameScreen
      }
    }
  ],

  TranslateCoordinates: [
    function(srcWid: number, dstWid: number, srcX: number, srcY: number) {
      return ['CxSLLSS', [40, 4, srcWid, dstWid, srcX, srcY]]
    },
    function(buf: Buffer, sameScreen: number) {
      const res = buf.unpack('Lss')
      return {
        child: res[0],
        destX: res[1],
        destY: res[2],
        sameScreen: sameScreen
      }
    }
  ],

  SetInputFocus: [
    function(wid: number, revertTo: 0 | 1 | 2) // revertTo: 0 - None, 1 - PointerRoot, 2 - Parent
    {
      return ['CCSLL', [42, revertTo, 3, wid, 0]]
    }
  ],

  GetInputFocus: [
    function() {
      return ['CxS', [43, 1]]
    },
    function(buf: Buffer, revertTo: 0 | 1 | 2) {
      return {
        focus: buf.unpack('L')[0],
        revertTo: revertTo
      }
    }
  ],

  WarpPointer: [
    function(srcWin: number, dstWin: number, srcX: number, srcY: number, srcWidth: number, srcHeight: number, dstX: number, dstY: number) {
      return ['CxSLLssSSss', [41, 6, srcWin, dstWin, srcX, srcY, srcWidth, srcHeight, dstX, dstY]]
    }
  ],

  ListFonts: [
    function(pattern: string, max: number) {
      const reqLen = 2 + paddedLength(pattern.length) / 4
      return ['CxSSSp', [49, reqLen, max, pattern.length, pattern]]
    },

    function(buf: Buffer) {
      console.log(buf)
      // TODO: move to buffer.unpackStringList
      const res: string[] = []
      let off = 24
      while (off < buf.length) {
        let len = buf[off++]
        if (len === 0) {
          break
        }
        if (off + len > buf.length) {
          len = buf.length - off
          if (len <= 0) {
            break
          }
        }
        res.push(buf.unpackString(len, off))
        off += len
      }
      return res
    }
  ],

  CreatePixmap: [
    function(pid: number, drawable: number, depth: number, width: number, height: number) {
      return ['CCSLLSS', [53, depth, 4, pid, drawable, width, height]]
    }
  ],

  FreePixmap: [
    function(pixmap: number) {
      return ['CxSL', [54, 2, pixmap]]
    }
  ],

  CreateCursor: [
    function(cid: number, source: number, mask: number, foreRGB: { R: number, G: number, B: number }, backRGB: { R: number, G: number, B: number }, x: number, y: number) {
      const foreR = foreRGB.R
      const foreG = foreRGB.G
      const foreB = foreRGB.B

      const backR = backRGB.R
      const backG = backRGB.G
      const backB = backRGB.B
      return ['CxSLLLSSSSSSSS', [93, 8, cid, source, mask, foreR, foreG, foreB, backR, backG, backB, x, y]]
    }
  ],

  // opcode 55
  CreateGC: [
    function(cid: number, drawable: number, values: Partial<{
      clipXOrigin: number; joinStyle: number; capStyle: number; arcMode: number; subwindowMode: number; foreground: number; graphicsExposures: number; clipMask: number; dashOffset: number; lineWidth: number; dashes: number; lineStyle: number; fillRule: number; background: number; function: number; tileStippleYOrigin: number; tile: number; fillStyle: number; stipple: number; planeMask: number; clipYOrigin: number; tileStippleXOrigin: number; font: number
    }>) {
      let format = 'CxSLLL'
      const vals = packValueMask('CreateGC', values)
      const packetLength = 4 + (values ? vals[2].length : 0)
      let args = [55, packetLength, cid, drawable]
      format += vals[0]
      args.push(vals[1])     // values bitmask
      args = args.concat(vals[2])
      return [format, args]
    }
  ],

  ChangeGC: [
    function(cid: number, values: Partial<{
      clipXOrigin: number; joinStyle: number; capStyle: number; arcMode: number; subwindowMode: number; foreground: number; graphicsExposures: number; clipMask: number; dashOffset: number; lineWidth: number; dashes: number; lineStyle: number; fillRule: number; background: number; function: number; tileStippleYOrigin: number; tile: number; fillStyle: number; stipple: number; planeMask: number; clipYOrigin: number; tileStippleXOrigin: number; font: number
    }>) {
      let format = 'CxSLL'
      const vals = packValueMask('CreateGC', values)
      const packetLength = 3 + (values ? vals[2].length : 0)
      let args = [56, packetLength, cid]
      format += vals[0]
      args.push(vals[1])     // values bitmask
      args = args.concat(vals[2])
      return [format, args]
    }
  ],

  ClearArea: [
    function(wid: number, x: number, y: number, width: number, height: number, exposures: number) {
      return ['CCSLssSS', [61, exposures, 4, wid, x, y, width, height]]
    }
  ],

  CopyArea: [
    function(srcDrawable: number, dstDrawable: number, gc: number, srcX: number, srcY: number, dstX: number, dstY: number, width: number, height: number) {
      return ['CxSLLLssssSS', [62, 7, srcDrawable, dstDrawable, gc, srcX, srcY, dstX, dstY, width, height]]
    }
  ],

  PolyPoint: [
    function(coordMode: number, drawable: number, gc: number, points: []) {
      let format = 'CCSLL'
      const args = [64, coordMode, 3 + points.length / 2, drawable, gc]
      for (let i = 0; i < points.length; ++i) {
        format += 'S'
        args.push(points[i])
      }
      return [format, args]
    }
  ],

  PolyLine: [
    // TODO: remove copy-paste - exectly same as PolyPoint, only differ with opcode
    function(coordMode: number, drawable: number, gc: number, points: []) {
      let format = 'CCSLL'
      const args = [65, coordMode, 3 + points.length / 2, drawable, gc]
      for (let i = 0; i < points.length; ++i) {
        format += 'S'
        args.push(points[i])
      }
      return [format, args]
    }

  ],

  PolyFillRectangle: [
    function(drawable: number, gc: number, coords: []) { // x1, y1, w1, h1, x2, y2, w2, h2...
      let format = 'CxSLL'
      const numrects4bytes = coords.length / 2
      const args = [70, 3 + numrects4bytes, drawable, gc]
      for (let i = 0; i < coords.length; ++i) {
        format += 'S'
        args.push(coords[i])
      }
      return [format, args]
    }
  ],

  PolyFillArc: [
    function(drawable: number, gc: number, coords: []) { // x1, y1, w1, h1, a11, a12, ...
      let format = 'CxSLL'
      const numrects4bytes = coords.length / 2
      const args = [71, 3 + numrects4bytes, drawable, gc]
      for (let i = 0; i < coords.length; ++i) {
        format += 'S'
        args.push(coords[i])
      }
      return [format, args]
    }
  ],

  PutImage: [
    // format:  0 - Bitmap, 1 - XYPixmap, 2 - ZPixmap
    function(format: 0 | 1 | 2, drawable: number, gc: number, width: number, height: number, dstX: number, dstY: number, leftPad: number, depth: number, data: Buffer) {
      const padded = paddedLength(data.length)
      const reqLen = 6 + padded / 4 // (length + 3) >> 2 ???
      const padLength = padded - data.length
      const pad = Buffer.alloc(padLength) // TODO: new pack format 'X' - skip amount of bytes supplied in numerical argument

      // TODO: move code to calculate reqLength and use BigReq if needed outside of corereq.js
      // NOTE: big req is used here (first 'L' in format, 0 and +1 in params), won't work if not enabled
      return ['CCSLLLSSssCCxxaa', [72, format, 0, 1 + reqLen, drawable, gc, width, height, dstX, dstY, leftPad, depth, data, pad]]
    }
  ],

  GetImage: [
    function(format: 0 | 1 | 2, drawable: number, x: number, y: number, width: number, height: number, planeMask: number) {
      return ['CCSLssSSL', [73, format, 5, drawable, x, y, width, height, planeMask]]
    },
    function(buf: Buffer, depth: number) {
      const visualId = buf.unpack('L')[0]
      return {
        depth: depth,
        visualId: visualId,
        data: buf.slice(24)
      }
    }
  ],

  PolyText8: [
    function(drawable: number, gc: number, x: number, y: number, items: string[]) {
      let format = 'CxSLLss'
      const numItems = items.length
      let reqLen = 16
      const args: (number | string)[] = [74, 0, drawable, gc, x, y]
      for (let i = 0; i < numItems; ++i) {
        const it = items[i]
        if (typeof it === 'string') {
          if (it.length > 254) { // TODO: split string in set of items
            throw new Error('not supported yet')
          }
          format += 'CCa'
          args.push(it.length)
          args.push(0) // delta???
          args.push(it)
          reqLen += 2 + it.length
        } else {
          throw new Error('not supported yet')
        }
      }
      const len4 = paddedLength(reqLen) / 4
      const padLen = len4 * 4 - reqLen
      args[1] = len4 // set request length to calculated value
      let pad = ''
      for (let i = 0; i < padLen; ++i) {
        pad += String.fromCharCode(0)
      }
      format += 'a'
      args.push(pad)
      return [format, args]
    }
  ],

  CreateColormap:
    [
      function(cmid: number, wid: number, vid: number, alloc: number) {
        return ['CCSLLL', [78, alloc, 4, cmid, wid, vid]]
      }
    ],

  AllocColor: [
    ['CxSLSSSxx', [84, 4]], // params: colormap, red, green, blue

    function(buf: Buffer) {
      const res = buf.unpack('SSSxL')
      return {
        red: res[0],
        blue: res[1],
        green: res[2],
        pixel: res[3] >> 8 // it looks like 3 first bytes contain RGB value in response
      }
    }
  ],

  QueryExtension: [
    function(name: string) {
      const padded = padded_string(name)
      return ['CxSSxxa', [98, 2 + padded.length / 4, name.length, padded]]
    },

    function(buf: Buffer) {
      const res = buf.unpack('CCCC')
      return {
        present: res[0],
        majorOpcode: res[1],
        firstEvent: res[2],
        firstError: res[3]
      }
    }
  ],

  ListExtensions: [
    ['CxS', [99, 1]],

    function(buf: Buffer) {
      // TODO: move to buffer.unpackStringList
      const res = []
      let off = 24
      while (off < buf.length) {
        let len = buf[off++]
        if (len === 0) {
          break
        }
        if (off + len > buf.length) {
          len = buf.length - off
          if (len <= 0) {
            break
          }
        }
        res.push(buf.unpackString(len, off))
        off += len
      }
      return res
    }
  ],

  GetKeyboardMapping: [
    function(startCode: number, num: number) {
      return ['CxSCCxx', [101, 2, startCode, num]]
    },
    function(buff: Buffer, listLength: number) {
      const res = []
      let format = ''
      for (let i = 0; i < listLength; ++i) {
        format += 'L'
      }
      for (let offset = 24; offset < buff.length - 4 * listLength; offset += 4 * listLength) {
        res.push(buff.unpack(format, offset))
      }
      return res
    }
  ],

  // todo: move up to keep reque
  GetGeometry: [
    function(drawable: number) {
      return ['CxSL', [14, 2, drawable]]
    },
    function(buff: Buffer, depth: number) {
      const res = buff.unpack('LssSSSx')
      return {
        windowid: res[0],
        xPos: res[1],
        yPos: res[2],
        width: res[3],
        height: res[4],
        borderWidth: res[5],
        depth
      }
    }
  ],

  KillClient: [
    function(resource: number) {
      return ['CxSL', [113, 2, resource]]
    }
  ],

  SetScreenSaver: [
    function(timeout: number, interval: number, preferBlanking: number, allowExposures: number) {
      return ['CxSssCCxx', [107, 3, timeout, interval, preferBlanking, allowExposures]]
    }
  ],

  Bell: [
    // FIXME param not used?
    function(percent: number) {
      return ['CxCs', [108, 1]]
    }
  ],

  ForceScreenSaver: [
    function(activate: boolean) {
      return ['CCS', [115, activate ? 1 : 0, 1]]
    }
  ]
}
