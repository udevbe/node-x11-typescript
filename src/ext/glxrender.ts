// see http://cgit.freedesktop.org/mesa/mesa/tree/src/mapi/glapi/gen/gl_API.xml

import { GLX } from './glx'
import glxconstants from './glxconstants'

const MAX_SMALL_RENDER = 65536 - 16

export type RenderPipeline = {
  PushMatrix: () => void;
  TexCoord2f: (x: number, y: number) => void;
  Vertex3f: (x: number, y: number, z: number) => void;
  BlendFunc: (sfactor: number, dfactor: number) => void;
  Hint: (target: number, mode: number) => void;
  ProgramString: (target: number, format: number, src: number) => void;
  Render: (ctxLocal?: number) => void;
  Color3f: (r: number, g: number, b: number) => void;
  Clear: (mask: number) => void;
  Ortho: (left: number, right: number, bottom: number, top: number, znear: number, zfar: number) => void;
  Normal3fv: (v: [number, number, number]) => void;
  Translatef: (x: number, y: number, z: number) => void;
  BindTexture: (target: number, texture: number) => void;
  Begin: (what: number) => void;
  Enable: (value: number) => void;
  LoadIdentity: () => void;
  BindProgram: (target: number, program: number) => void;
  TexEnvf: (target: number, pname: number, param: number) => void;
  Frustum: (left: number, right: number, bottom: number, top: number, znear: number, zfar: number) => void;
  ClearColor: (r: number, g: number, b: number, a: number) => void;
  PopMatrix: () => void;
  PointSize: (r: number) => void;
  Color4f: (r: number, g: number, b: number, a: number) => void;
  MatrixMode: (mode: number) => void;
  Lightfv: (light: number, name: number, p1: (number | [number, number, number, number]), p2?: number, p3?: number, p4?: number) => void;
  Viewport: (x: number, y: number, w: number, h: number) => void;
  Vertex3fv: (v: [number, number, number]) => void;
  CallList: (list: number) => void;
  Rotatef: (a: number, x: number, y: number, z: number) => void;
  TexImage2D: (target: number, level: number, internalFormat: number, width: number, height: number, border: number, format: number, type: number, data: Buffer) => void;
  ShadeModel: (model: number) => void;
  TexParameterf: (target: number, pname: number, param: number) => void;
  TexParameterfv: (target: number, pname: number, param: number[]) => void;
  TexParameteri: (target: number, pname: number, param: number) => void;
  Materialfv: (light: number, name: number, p1: (number | [number, number, number, number]), p2?: number, p3?: number, p4?: number) => void;
  End: () => void;
  Normal3f: (x: number, y: number, z: number) => void;
  Scalef: (x: number, y: number, z: number) => void
}

export const glxrender = (glx: GLX, ctx: number): RenderPipeline => {
  let buffers: Buffer[] = []
  let currentLength = 0

  function commandBuffer(opcode: number, len: number) {
    if (currentLength + len > MAX_SMALL_RENDER) {
      render()
    }
    if (len > MAX_SMALL_RENDER) {
      throw Error('Buffer too big. Make sure you are using RenderLarge for large commands')
    }

    currentLength += len
    const res = Buffer.alloc(len)
    res.writeUInt16LE(len, 0)
    res.writeUInt16LE(opcode, 2)
    return res
  }

  function serialize0(opcode: number) {
    buffers.push(commandBuffer(opcode, 4))
  }

  function serialize3fv(opcode: number, c1: number, c2: number, c3: number) {
    const res = commandBuffer(opcode, 16)
    res.writeFloatLE(c1, 4)
    res.writeFloatLE(c2, 8)
    res.writeFloatLE(c3, 12)
    buffers.push(res)
  }

  function serialize4fv(opcode: number, c1: number, c2: number, c3: number, c4: number) {
    const res = commandBuffer(opcode, 20)
    res.writeFloatLE(c1, 4)
    res.writeFloatLE(c2, 8)
    res.writeFloatLE(c3, 12)
    res.writeFloatLE(c4, 16)
    buffers.push(res)
  }

  function serialize4i(opcode: number, c1: number, c2: number, c3: number, c4: number) {
    const res = commandBuffer(opcode, 20)
    res.writeInt32LE(c1, 4)
    res.writeInt32LE(c2, 8)
    res.writeInt32LE(c3, 12)
    res.writeInt32LE(c4, 16)
    buffers.push(res)
  }

  function serialize6d(opcode: number, d1: number, d2: number, d3: number, d4: number, d5: number, d6: number) {
    const res = commandBuffer(opcode, 52)
    res.writeDoubleLE(d1, 4)
    res.writeDoubleLE(d2, 12)
    res.writeDoubleLE(d3, 20)
    res.writeDoubleLE(d4, 28)
    res.writeDoubleLE(d5, 36)
    res.writeDoubleLE(d6, 44)
    buffers.push(res)
  }

  function serialize1i(opcode: number, value: number) {
    const res = commandBuffer(opcode, 8)
    res.writeUInt32LE(value, 4)
    buffers.push(res)
  }

  function serialize1f(opcode: number, value: number) {
    const res = commandBuffer(opcode, 8)
    res.writeFloatLE(value, 4)
    buffers.push(res)
  }

  function serialize2f(opcode: number, f1: number, f2: number) {
    const res = commandBuffer(opcode, 12)
    res.writeFloatLE(f1, 4)
    res.writeFloatLE(f2, 8)
    buffers.push(res)
  }

  function serialize2i(opcode: number, i1: number, i2: number) {
    const res = commandBuffer(opcode, 12)
    res.writeUInt32LE(i1, 4)
    res.writeUInt32LE(i2, 8)
    buffers.push(res)
  }

  function serialize3i(opcode: number, i1: number, i2: number, i3: number) {
    const res = commandBuffer(opcode, 16)
    res.writeUInt32LE(i1, 4)
    res.writeUInt32LE(i2, 8)
    res.writeUInt32LE(i3, 12)
    buffers.push(res)
  }

  function serialize2i1f(opcode: number, i1: number, i2: number, f1: number) {
    const res = commandBuffer(opcode, 16)
    res.writeUInt32LE(i1, 4)
    res.writeUInt32LE(i2, 8)
    res.writeFloatLE(f1, 12)
    buffers.push(res)
  }

  function serialize2ifv(opcode: number, i1: number, i2: number, fv: number[]) {
    const res = commandBuffer(opcode, 12 + fv.length * 4)
    res.writeUInt32LE(i1, 4)
    res.writeUInt32LE(i2, 8)
    for (let i = 0; i < fv.length; ++i) {
      res.writeFloatLE(fv[i], 12 + i * 4)
    }
    buffers.push(res)
  }

  function serialize2i4f(opcode: number, i1: number, i2: number, f1: number, f2: number, f3: number, f4: number) {
    const res = commandBuffer(opcode, 28)
    res.writeUInt32LE(i1, 4)
    res.writeUInt32LE(i2, 8)
    res.writeFloatLE(f1, 12)
    res.writeFloatLE(f2, 16)
    res.writeFloatLE(f3, 20)
    res.writeFloatLE(f4, 24)
    buffers.push(res)
  }

  function render(ctxLocal?: number) {

    if (!ctxLocal) { // ctxLocal overrides ctx passed during creation of renderContext
      ctxLocal = ctx
    }

    if (buffers.length === 0) {
      buffers = []
      currentLength = 0
      return
    }

    glx.Render(ctxLocal, buffers)
    buffers = []
    currentLength = 0
  }

  const renderContext = {
    Render: render,
    Begin: (what: number) => {
      serialize1i(4, what)
    },
    End: () => {
      serialize0(23)
    },
    Ortho: (left: number, right: number, bottom: number, top: number, znear: number, zfar: number) => {
      serialize6d(182, left, right, bottom, top, znear, zfar)
    },
    Frustum: (left: number, right: number, bottom: number, top: number, znear: number, zfar: number) => {
      serialize6d(182, left, right, bottom, top, znear, zfar)
    },
    PopMatrix: () => {
      serialize0(183)

    },
    PushMatrix: () => {
      serialize0(184)
    },
    LoadIdentity: () => {
      serialize0(176)
    },
    Rotatef: (a: number, x: number, y: number, z: number) => {
      serialize4fv(186, a, x, y, z)
    },
    CallList: (list: number) => {
      serialize1i(1, list)
    },
    Viewport: (x: number, y: number, w: number, h: number) => {
      serialize4i(191, x, y, w, h) // TODO: x,y - signed, w,h - unsigned (currently all 4 unsigned)
    },
    Vertex3f: (x: number, y: number, z: number) => {
      serialize3fv(70, x, y, z)
    },
    Vertex3fv: (v: [number, number, number]) => {
      serialize3fv(70, v[0], v[1], v[2])
    },
    Color3f: (r: number, g: number, b: number) => {
      serialize3fv(8, r, g, b)
    },
    Normal3f: (x: number, y: number, z: number) => {
      serialize3fv(30, x, y, z)
    },
    Normal3fv: (v: [number, number, number]) => {
      serialize3fv(70, v[0], v[1], v[2])
    },
    Color4f: (r: number, g: number, b: number, a: number) => {
      serialize4fv(16, r, g, b, a)
    },
    Scalef: (x: number, y: number, z: number) => {
      serialize3fv(188, x, y, z)
    },
    Translatef: (x: number, y: number, z: number) => {
      serialize3fv(190, x, y, z)
    },
    ClearColor: (r: number, g: number, b: number, a: number) => {
      serialize4fv(0x82, r, g, b, a)
    },
    MatrixMode: (mode: number) => {
      serialize1i(179, mode)
    },
    Enable: (value: number) => {
      serialize1i(139, value)
    },
    Lightfv: (light: number, name: number, p1: number | [number, number, number, number], p2?: number, p3?: number, p4?: number) => {
      if (typeof p1 !== 'number') {
        serialize2i4f(87, light, name, p1[0], p1[1], p1[2], p1[3])
      } else {
        // @ts-ignore
        serialize2i4f(87, light, name, p1, p2, p3, p4)
      }
    },
    Materialfv: (light: number, name: number, p1: number | [number, number, number, number], p2?: number, p3?: number, p4?: number) => {
      if (typeof p1 !== 'number') {
        serialize2i4f(97, light, name, p1[0], p1[1], p1[2], p1[3])
      } else {
        // @ts-ignore
        serialize2i4f(97, light, name, p1, p2, p3, p4)
      }
    },
    Clear: (mask: number) => {
      serialize1i(0x7f, mask)
    },
    ShadeModel: (model: number) => {
      serialize1i(104, model)
    },
    BlendFunc: (sfactor: number, dfactor: number) => {
      serialize2i(160, sfactor, dfactor)
    },
    PointSize: (r: number) => {
      serialize1f(100, r)
    },
    Hint: (target: number, mode: number) => {
      serialize2i(85, target, mode)
    },
    BindTexture: (target: number, texture: number) => {
      serialize2i(4117, target, texture)
    },
    TexEnvf: (target: number, pname: number, param: number) => {
      serialize2i1f(112, target, pname, param)
    },
    TexParameterf: (target: number, pname: number, param: number) => {
      serialize2i1f(105, target, pname, param)
    },
    TexParameterfv: (target: number, pname: number, param: number[]) => {
      serialize2ifv(106, target, pname, param)
    },
    TexParameteri: (target: number, pname: number, param: number) => {
      serialize3i(107, target, pname, param)
    },
    TexImage2D: (target: number, level: number, internalFormat: number, width: number, height: number, border: number, format: number, type: number, data: Buffer) => {

      render()

      const typeSize = []
      typeSize[glxconstants.FLOAT] = 4
      typeSize[glxconstants.BYTE] = 1
      typeSize[glxconstants.UNSIGNED_BYTE] = 1

      const res = Buffer.alloc(60 + data.length * typeSize[type])
      res.writeUInt32LE(res.length, 0)
      res.writeUInt32LE(110, 4)

      res[8] = 0 // swapbytes
      res[9] = 0 // lsbfirst
      res.writeUInt16LE(0, 10)   // unused

      /*
      defaults: (from http://stackoverflow.com/questions/21563590/glteximage2d-protocol-arguments?noredirect=1#comment32577251_21563590 )

      GL_UNPACK_SWAP_BYTES        boolean   false           true or false
      GL_UNPACK_LSB_FIRST         boolean   false           true or false
      GL_UNPACK_ROW_LENGTH        integer   0               [0,oo)
      GL_UNPACK_SKIP_ROWS         integer   0               [0,oo)
      GL_UNPACK_SKIP_PIXELS       integer   0               [0,oo)
      GL_UNPACK_ALIGNMENT         integer   4               1, 2, 4, or 8

      */

      res.writeUInt32LE(0, 12)   // rowlength
      res.writeUInt32LE(0, 16)  // skiprows
      res.writeUInt32LE(0, 20)  // skippixels
      res.writeUInt32LE(4, 24)  // alignment

      res.writeUInt32LE(target, 28)
      res.writeUInt32LE(level, 32)
      res.writeUInt32LE(internalFormat, 36)
      res.writeUInt32LE(width, 40)
      res.writeUInt32LE(height, 44)
      res.writeUInt32LE(border, 48)
      res.writeUInt32LE(format, 52)
      res.writeUInt32LE(type, 56)

      switch (type) {
        case glxconstants.FLOAT:
          for (let i = 0; i < data.length; ++i) {
            res.writeFloatLE(data[i], 60 + i * typeSize[type])
          }
          break
        case glxconstants.BYTE:
        case glxconstants.UNSIGNED_BYTE:
          for (let i = 0; i < data.length; ++i) {
            res[60 + i] = data[i]
          }
          break
        default:
          throw new Error('unsupported texture type:' + type)
      }

      // make sure buffer for glxRender request is emptied first
      render()

      let dataLen = res.length
      const maxSize = 262124
      // @ts-ignore
      let totalRequests = 1 + parseInt(dataLen / maxSize, 10) - 1
      if (dataLen % maxSize) {
        totalRequests++
      }

      // for some reason RenderLarge does not like everything to be sent in one go
      // add one extra buffer request for small requests
      if (dataLen < maxSize) {
        glx.RenderLarge(ctx, 1, 2, res)
        glx.RenderLarge(ctx, 2, 2, new Buffer(0))
        return
      }

      let pos = 0
      let reqNum = 1
      while (dataLen > 0) {
        if (dataLen < maxSize) {
          glx.RenderLarge(ctx, reqNum, totalRequests, res.slice(pos))
          break
        } else {
          glx.RenderLarge(ctx, reqNum, totalRequests, res.slice(pos, pos + maxSize))
          pos += maxSize
          dataLen -= maxSize
          reqNum++
        }
      }

    },

    ProgramString: (target: number, format: number, src: number) => {
      // FIXME bug: missing opcode?
      // @ts-ignore
      serialize3i(target, format, src)
      buffers.push(new Buffer(src))
    },

    BindProgram: (target: number, program: number) => {
      // FIXME bug: all kinds of missing things here...
      // serialize2i(target, format, src)
    },


    TexCoord2f: (x: number, y: number) => {
      serialize2f(54, x, y)
    }
  }

  // bind some glx functions
  'NewList EndList GenLists GenTextures IsTexture SwapBuffers Finish'.split(' ').forEach(name => {
    // todo: small camelCase ? to be consistent with webgl api
    // renderContext[name] = GLX[name].bind(GLX, ctx);

    // flush render buffer before glx requests
    // @ts-ignore
    renderContext[name] = (p1, p2, p3, p4, p5, p6, p7, p8) => {
      render()
      // @ts-ignore
      glx[name](ctx, p1, p2, p3, p4, p5, p6, p7, p8)
    }
  })

  return renderContext
}
