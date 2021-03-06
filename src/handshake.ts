import getAuthString from './auth'
import { PackStream } from './unpackstream'
import type { XCallback, XConnectionOptions, XDisplay, XScreen, XVisual } from './xcore'
import { paddedLength } from './xutil'

function readVisuals(bl: PackStream, visuals: { [key: string]: XVisual }, nVisuals: number, cb: () => void) {
  if (nVisuals === 0) {
    cb()
    return
  }

  const visual = {} as XVisual
  // @ts-ignore
  bl.unpackTo(visual,
    [
      'L vid',
      'C class',
      'C bits_per_rgb',
      'S map_ent',
      'L red_mask',
      'L green_mask',
      'L blue_mask',
      'xxxx'
    ],
    () => {
      const vid: number = visual.vid as number
      // delete visual.vid;
      visuals[vid] = visual
      if (Object.keys(visuals).length === nVisuals) {
        cb()
      }
      else {
        readVisuals(bl, visuals, nVisuals, cb)
      }
    })
}

function readScreens(bl: PackStream, display: XDisplay, cbDisplayReady: XCallback<XDisplay>) {
  let numParsedDepths = 0
  const readDepths = (bl: PackStream, display: XDisplay, depths: { [key: string]: { [key: string]: XVisual } }, nDepths: number, cb: () => void) => {
    if (nDepths === 0) {
      cb()
      return
    }

    bl.unpack('CxSxxxx', res => {
      const dep = res[0]
      const nVisuals = res[1]
      const visuals: { [key: string]: XVisual } = {}
      readVisuals(bl, visuals, nVisuals, () => {
        if (dep in depths) {
          for (let visual in visuals) {
            // FIXME this line doesn't make sense
            depths[dep][visual] = visuals[visual]
          }
        } else {
          depths[dep] = visuals
        }
        numParsedDepths++
        if (numParsedDepths === nDepths) {
          cb()
        }
        else {
          readDepths(bl, display, depths, nDepths, cb)
        }
      })
    })
  }

  // for (i=0; i < display.screen_num; ++i)
  {
    const scr = {} as XScreen
    // FIXME root_depth twice?
    bl.unpackTo(scr as Omit<XScreen, 'depths'>,
      [
        'L root',
        'L default_colormap',
        'L white_pixel',
        'L black_pixel',
        'L input_masks',
        'S pixel_width',
        'S pixel_height',
        'S mm_width',
        'S mm_height',
        'S min_installed_maps',
        'S max_installed_maps',
        'L root_visual',
        'C root_depth',
        'C backing_stores',
        'C root_depth',
        'C num_depths'
      ],
      () => {
        const depths = {}

        readDepths(bl, display, depths, scr.num_depths as number, () => {

          scr.depths = depths
          delete scr.num_depths
          display.screen.push(scr as XScreen)

          if (display.screen.length === display.screen_num) {
            delete display.screen_num
            cbDisplayReady(null, display)
            return
          } else {
            readScreens(bl, display, cbDisplayReady)
          }
        })
      })
  }
}

export function readServerHello(bl: PackStream, cb: XCallback<XDisplay, Error>) {
  bl.unpack('C', (res: number[]) => {
    if (res[0] === 0) {
      // conection time error
      // unpack error
      bl.unpack('Cxxxxxx', rlen => {
        bl.get(rlen[0], reason => {
          const err = new Error('X server connection failed: ' + reason.toString())
          cb(err)
        })
      })
      // TODO: do we need to close stream from our side?
      // TODO: api to close source stream via attached unpackstream
      return
    }
    const display = {} as XDisplay
    bl.unpackTo(
      display as Omit<XDisplay, 'screen' | 'vendor' | 'format' | 'client'>,
      [
        'x',
        'S major',
        'S minor',
        'S xlen',
        'L release',
        'L resource_base',
        'L resource_mask',
        'L motion_buffer_size',
        'S vlen',
        'S max_request_length',
        'C screen_num',
        'C format_num',
        'C image_byte_order',
        'C bitmap_bit_order',
        'C bitmap_scanline_unit',
        'C bitmap_scanline_pad',
        'C min_keycode',
        'C max_keycode',
        'xxxx'
      ],

      () => {
        const pvlen = paddedLength(display.vlen)

        // setup data to generate resource id
        // TODO: cleaunup code here
        const mask = display.resource_mask as number
        display.rsrc_shift = 0
        while (!((mask >> display.rsrc_shift) & 1)) {
          display.rsrc_shift++
        }
        display.rsrc_id = 0

        bl.get(pvlen, vendor => {
          display.vendor = vendor.toString().substr(0, display.vlen) // utf8 by default?

          display.format = {}
          for (let i = 0; i < (display.format_num as number); ++i) {
            bl.unpack('CCCxxxxx', fmt => {
              const depth = fmt[0]
              display.format[depth] = {
                bits_per_pixel: fmt[1],
                scanline_pad: fmt[2]
              }
              if (Object.keys(display.format).length === display.format_num) {
                delete display.format_num
                display.screen = []
                readScreens(bl, display, cb)
              }
            })
          }
        })
      }
    )
  })

}

function getByteOrder(): number {
  const isLittleEndian = ((new Uint32Array((new Uint8Array([1, 2, 3, 4])).buffer))[0] === 0x04030201)
  if (isLittleEndian) {
    return 'l'.charCodeAt(0)
  } else {
    return 'B'.charCodeAt(0)
  }
}

// TODO give options type of connection options
// TODO give stream type of PackStream from unpackstream file
export function writeClientHello(stream: PackStream, displayNum: string, authHost: string, socketFamily: 'IPv4' | 'IPv6' | undefined, options: XConnectionOptions): void {
  getAuthString(displayNum, authHost, socketFamily, (err, cookie) => {
    if (err) {
      throw err
    }
    if (!cookie) {
      throw new Error('No Cookie found :(')
    }
    const byteOrder = getByteOrder()
    const protocolMajor = 11 // TODO: config? env?
    const protocolMinor = 0
    stream.pack(
      'CxSSSSxxpp',
      [
        byteOrder,
        protocolMajor,
        protocolMinor,
        cookie.authName.length,
        cookie.authData.length,
        cookie.authName,
        cookie.authData
      ]
    )
    stream.flush()
  }, options)
}
