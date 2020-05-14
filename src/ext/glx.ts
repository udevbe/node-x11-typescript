/*
  second extension to try
  links to get started:

  http://cgit.freedesktop.org/xcb/proto/tree/src/glx.xml?id=HEAD
  http://cgit.freedesktop.org/mesa/mesa/tree/src/glx
  http://cgit.freedesktop.org/mesa/mesa/tree/src/glx/indirect.c

  http://www.opengl.org/wiki/Tutorial:_OpenGL_3.0_Context_Creation_(GLX)

  https://github.com/xderoche/J11/blob/master/src/gnu/x11/extension/glx/GL.java


*/
// TODO: move to templates
import { XCallback, XClient, XExtension, XExtensionInit } from '../xcore'

import * as glxrender from './glxrender'

interface GLX extends XExtension {
  QueryVersion: (clientMaj: number, clientMin: number, callback: XCallback<[number, number]>) => void
  QueryServerString: (screen: number, name: number, callback: XCallback<string>) => void
  CreateGLXPixmap: (screen: number, visual: number, pixmap: number, glxpixmap: number) => void
  QueryExtensionsString: (screen: number, callback: XCallback<string>) => void
  GetVisualConfigs: (screen: number, callback: XCallback<{
    visualID: number,
    visualType: number,
    rgbMode: number,
    redBits: number,
    greenBits: number,
    blueBits: number,
    alphaBits: number,
    accumRedBits: number,
    accumGreen: number,
    accumBlueBits: number,
    accumAlphaBits: number,
    doubleBufferMode: number,
    stereoMode: number,
    rgbBits: number,
    depthBits: number,
    stencilBits: number,
    numAuxBuffers: number,
    level: number
  }[]>) => void,
  GetFBConfigs: (screen: number, callback: XCallback<[number, number][][]>) => void
  CreateContext: (ctx: number, visual: number, screen: number, shareListCtx: number, isDirect: boolean) => void
  SwapBuffers: (ctx: number, drawable: number) => void
  NewList: (ctx: number, list: number, mode: number) => void
  EndList: (ctx: number) => void
  GenLists: (ctx: number, count: number, callback: XCallback<number>) => void
  GenTextures: (ctx: number, count: number, callback: XCallback<string>) => void
  MakeCurrent: (drawable: number, ctx: number, oldctx: number, callback: XCallback<number>) => void
  Finish: (ctx: number, callback: XCallback<void>) => void
  Render: (ctx: number, data: Buffer | Array<Buffer>) => void
  VendorPrivate: (ctx: number, code: number, data: Buffer) => void
  BindTexImage: (ctx: number, drawable: number, buffer: number, attribs: number[]) => void
  ReleaseTexImage: (ctx: number, drawable: number, buffer: number) => void
  RenderLarge: (ctx: number, requestNum: number, requestTotal: number, data: Buffer) => void
  renderPipeline: (ctx: number) => glxrender
}

export const requireExt: XExtensionInit<GLX> = (display, callback) => {
  const X = display.client as XClient
  // @ts-ignore
  X.QueryExtension<GLX>('GLX', (err, ext) => {
    if (err) {
      return callback(err)
    }

    // @ts-ignore
    if (!ext.present) {
      return callback(new Error('extension not available'))
    }

    // @ts-ignore
    ext.QueryVersion = (clientMaj, clientMin, callback) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 7, 3, clientMaj, clientMin])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('LL'),
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.QueryServerString = (screen: number, name: number, callback: XCallback<string>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 19, 3, screen, name])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const len = buf.unpack('xxxxL')[0]
          return buf.toString().substring(24, 24 + len * 4)
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.CreateGLXPixmap = (screen: number, visual: number, pixmap: number, glxpixmap: number) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLLL', [ext.majorOpcode, 13, 5, screen, visual, pixmap, glxpixmap])

      // console.log('CreateGlxPix', X.seqNum)
      // console.log(ext.majorOpcode, 13, 5, screen, visual, pixmap, glxpixmap)
      // console.trace()


      X.packStream.flush()
    }

    // @ts-ignore
    ext.QueryExtensionsString = (screen: number, callback: XCallback<string>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 18, 2, screen])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const len = buf.unpack('xxxxL')[0]
          return buf.toString().substring(24, 24 + len * 4)
        },
        callback
      ]
      X.packStream.flush()
    }

    // see __glXInitializeVisualConfigFromTags in mesa/src/glx/glxext.c
    //
    // @ts-ignore
    ext.GetVisualConfigs = (screen: number, callback: XCallback<{
      visualID: number,
      visualType: number,
      rgbMode: number,
      redBits: number,
      greenBits: number,
      blueBits: number,
      alphaBits: number,
      accumRedBits: number,
      accumGreen: number,
      accumBlueBits: number,
      accumAlphaBits: number,
      doubleBufferMode: number,
      stereoMode: number,
      rgbBits: number,
      depthBits: number,
      stencilBits: number,
      numAuxBuffers: number,
      level: number
    }[]>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 14, 2, screen])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const res = buf.unpack('LL')
          const numConfigs = res[0]
          const numProps = res[1]
          const configs = new Array(numConfigs)
          for (let i = 0; i < numConfigs; ++i) {
            const props = {} // new Array(numProps);
            const names = 'visualID visualType rgbMode redBits greenBits blueBits alphaBits accumRedBits accumGreen accumBlueBits accumAlphaBits doubleBufferMode stereoMode rgbBits depthBits stencilBits numAuxBuffers level'.split(' ')
            for (let j = 0; j < 18 && j < numProps; ++j) {
              // @ts-ignore
              props[names[j]] = buf.unpack('L', 24 + (i * numProps + j) * 4)[0]
            }
            // read tag + property
            configs[i] = props
          }

          return configs
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.GetFBConfigs = (screen: number, callback: XCallback<[number, number][][]>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 21, 2, screen])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const res = buf.unpack('LL')
          const numConfigs = res[0]
          const numProps = res[1]
          const configs = new Array(numConfigs)
          for (let i = 0; i < numConfigs; ++i) {
            const props = new Array(numProps)
            for (let j = 0; j < numProps; ++j) {
              props[j] = buf.unpack('LL', 24 + (i * numProps + j) * 8)
            }
            configs[i] = props
          }
          return configs
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.CreateContext = (ctx: number, visual: number, screen: number, shareListCtx: number, isDirect: boolean) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLLLCxxx', [ext.majorOpcode, 3, 6, ctx, visual, screen, shareListCtx, isDirect])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.SwapBuffers = (ctx: number, drawable: number) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 11, 3, ctx, drawable])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.NewList = (ctx: number, list: number, mode: number) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLL', [ext.majorOpcode, 101, 4, ctx, list, mode])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.EndList = (ctx: number) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 102, 2, ctx])
      X.packStream.flush()
    }

    // @ts-ignore
    ext.GenLists = (ctx: number, count: number, callback: XCallback<number>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 104, 3, ctx, count])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('L')[0],
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.GenTextures = (ctx: number, count: number, callback: XCallback<string>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 145, 3, ctx, count])
      X.replies[X.seqNum] = [
        (buf: Buffer) => {
          const format = new Buffer(count)
          format.fill('L')
          return buf.unpack('xxxxxxxxxxxxxxxxxxxxxxxx' + format.toString())
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.IsTexture = (ctx: number, texture: number, callback: XCallback<number[]>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 146, 3, ctx, texture])
      X.replies[X.seqNum] = [
        // FIXME this is probably wrong?
        (buf: Buffer) => buf.unpack('CCCCCCCCCCCCCCCCCCCCCCCCCC'),
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.MakeCurrent = (drawable: number, ctx: number, oldctx: number, callback: XCallback<number>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLLL', [ext.majorOpcode, 5, 4, drawable, ctx, oldctx])
      X.replies[X.seqNum] = [
        (buf: Buffer) => buf.unpack('L')[0],
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.Finish = (ctx: number, callback: XCallback<void>) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 108, 2, ctx])
      X.replies[X.seqNum] = [
        () => {
          return
        },
        callback
      ]
      X.packStream.flush()
    }

    // @ts-ignore
    ext.Render = (ctx: number, data: Buffer | Array<Buffer>) => {
      X.seqNum++
      let length = 0
      if (Buffer.isBuffer(data)) {
        length = 2 + data.length / 4
      } else if (Array.isArray(data)) {
        length = 2
        for (let i = 0; i < data.length; ++i) {
          length += data[i].length / 4
        }
      }
      // @ts-ignore
      X.packStream.pack('CCSL', [ext.majorOpcode, 1, length, ctx])
      if (Buffer.isBuffer(data)) {
        X.packStream.writeQueue.push(data)
      } else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; ++i) {
          X.packStream.writeQueue.push(data[i])
        }
      } else {
        throw new Error(`invalid data, expected buffer or buffers array, got:${data}`)
      }
      X.packStream.flush()
    }

    // @ts-ignore
    ext.VendorPrivate = (ctx: number, code: number, data: Buffer) => {
      X.seqNum++
      // @ts-ignore
      X.packStream.pack('CCSLL', [ext.majorOpcode, 16, 3 + data.length / 4, code, ctx])
      X.packStream.writeQueue.push(data)
      X.packStream.flush()
    }

    // 1330 - X_GLXvop_BindTexImageEXT
    // 1331 - X_GLXvop_ReleaseTexImageEXT
    // @ts-ignore
    ext.BindTexImage = (ctx: number, drawable: number, buffer: number, attribs: number[]) => {
      if (!attribs) {
        attribs = []
      }
      const data = Buffer.alloc(12 + attribs.length * 4)
      data.writeUInt32LE(drawable, 0)
      data.writeUInt32LE(buffer, 4)
      data.writeUInt32LE(attribs.length, 8)
      for (let i = 0; i < attribs.length; ++i) {
        data.writeUInt32LE(attribs[i], 12 + i * 4)
      }
      // @ts-ignore
      ext.VendorPrivate(ctx, 1330, data)
    }

    // @ts-ignore
    ext.ReleaseTexImage = (ctx: number, drawable: number, buffer: number) => {
      const data = Buffer.alloc(8)
      data.writeUInt32LE(drawable, 0)
      data.writeUInt32LE(buffer, 4)
      // @ts-ignore
      ext.VendorPrivate(ctx, 1331, data)
    }

    // VendorPrivateWithReply - opcode 17

    // @ts-ignore
    ext.RenderLarge = (ctx: number, requestNum: number, requestTotal: number, data: Buffer) => {
      X.seqNum++

      // var data = Buffer.concat(data);
      let padLength = 4 - data.length % 4
      if (padLength === 4) {
        padLength = 0
      }
      const length = 4 + (data.length + padLength) / 4
      // @ts-ignore
      X.packStream.pack('CCSLSSL', [ext.majorOpcode, 2, length, ctx, requestNum, requestTotal, data.length])

      X.packStream.writeQueue.push(data)
      const pad = Buffer.alloc(padLength)
      pad.fill(0)
      X.packStream.writeQueue.push(pad)
      X.packStream.flush()
    }

    // @ts-ignore
    ext.renderPipeline = (ctx: number) => glxrender(ext, ctx)

    const errors = [
      'context',
      'contect state',
      'drawable',
      'pixmap',
      'context tag',
      'current window',
      'Render request',
      'RenderLarge request',
      '(unsupported) VendorPrivate request',
      'FB config',
      'pbuffer',
      'current drawable',
      'window'
    ]

    errors.forEach((message, code) => {
      // @ts-ignore
      X.errorParsers[ext.firstError + code] = err => {
        err.message = 'GLX: Bad ' + message
        return err
      }
    })

    callback(null, ext)
  })
}

