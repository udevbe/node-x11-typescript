import { Buffer } from 'buffer'
import { EventEmitter } from 'events'
import { Writable } from 'stream'
import { padded_length } from './xutil'

enum ProtocolFormat {
  C = 'C',
  S = 'S',
  s = 's',
  l = 'l',
  L = 'L',
  x = 'x',
  p = 'p',
  a = 'a'
}

const argument_length: { [key: string]: number } = {
  [ProtocolFormat.C]: 1,
  [ProtocolFormat.S]: 2,
  [ProtocolFormat.s]: 2,
  [ProtocolFormat.L]: 4,
  [ProtocolFormat.l]: 4,
  [ProtocolFormat.x]: 1
}

interface ReadRequest {
  execute(bufferlist: PackStream): boolean
}

class ReadFormatRequest implements ReadRequest {
  private readonly format: string
  private current_arg: number
  private readonly data: number[]
  private readonly callback?: (data: number[]) => void

  constructor(format: string, callback?: (data: number[]) => void) {
    this.format = format
    this.current_arg = 0
    this.data = []
    this.callback = callback
  }

  execute(bufferlist: PackStream): boolean {
    while (this.current_arg < this.format.length) {
      const arg = this.format[this.current_arg]
      if (bufferlist.length < argument_length[arg])
        return false // need to wait for more data to prcess this argument

      // TODO: measure Buffer.readIntXXX performance and use them if faster
      // note: 4 and 2-byte values may cross chunk border & split. need to handle this correctly
      // maybe best approach is to wait all data required for format and then process fixed buffer
      // TODO: byte order!!!
      switch (arg) {
        case ProtocolFormat.C: {
          this.data.push(bufferlist.getbyte())
          break
        }
        case ProtocolFormat.S:
        case ProtocolFormat.s: {
          const b1 = bufferlist.getbyte()
          const b2 = bufferlist.getbyte()
          this.data.push(b2 * 256 + b1)
          break
        }
        case ProtocolFormat.l:
        case ProtocolFormat.L: {
          const b1 = bufferlist.getbyte()
          const b2 = bufferlist.getbyte()
          const b3 = bufferlist.getbyte()
          const b4 = bufferlist.getbyte()
          this.data.push(((b4 * 256 + b3) * 256 + b2) * 256 + b1)
          break
        }
        case ProtocolFormat.x: {
          bufferlist.getbyte()
          break
        }
      }
      this.current_arg++
    }
    this.callback?.(this.data)
    return true
  }
}

class ReadFixedRequest implements ReadRequest {
  private readonly length: number
  private readonly callback: (data: Buffer) => void
  private readonly data: Buffer
  private received_bytes: number

  constructor(length: number, callback: (data: Buffer) => void) {
    this.length = length
    this.callback = callback
    this.data = Buffer.alloc(length)
    this.received_bytes = 0
  }

  execute(bufferlist: PackStream): boolean {
    // TODO: this is a brute force version
    // replace with Buffer.slice calls
    const to_receive = this.length - this.received_bytes
    for (let i = 0; i < to_receive; ++i) {
      if (bufferlist.length == 0)
        return false
      this.data[this.received_bytes++] = bufferlist.getbyte()
    }
    this.callback(this.data)
    return true
  }
}

export class PackStream extends EventEmitter {
  length: number

  private readonly readlist: Buffer[]
  private offset: number
  private read_queue: ReadRequest[]
  write_queue: Buffer[]
  private write_length: number
  private resumed: boolean

  constructor() {
    super()
    this.readlist = []
    this.length = 0
    this.offset = 0
    this.read_queue = []
    this.write_queue = []
    this.write_length = 0
    this.resumed = false
  }

  write(buf: Buffer) {
    this.readlist.push(buf)
    this.length += buf.length
    this.resume()
  }

  pipe(stream: Writable) {
    // TODO: ondrain & pause
    this.on('data', data => {
      stream.write(data)
    })
  }

  unpack(format: string, callback?: (data: number[]) => void): void {
    this.read_queue.push(new ReadFormatRequest(format, callback))
    this.resume()
  }

  unpackTo(destination: { [key: string]: number }, names_formats: string[], callback: (arg: { [key: string]: number }) => void) {
    const names: string[] = []
    let format: string = ''

    for (let i = 0; i < names_formats.length; ++i) {
      let off = 0
      while (off < names_formats[i].length && names_formats[i][off] === ProtocolFormat.x) {
        format += ProtocolFormat.x
        off++
      }

      if (off < names_formats[i].length) {
        const formatName = names_formats[i][off] as keyof typeof ProtocolFormat
        format += formatName
        const name = names_formats[i].substr(off + 2)
        names.push(name)
      }
    }

    this.unpack(format, function(data) {
      if (data.length != names.length)
        throw 'Number of arguments mismatch, ' + names.length + ' fields and ' + data.length + ' arguments'
      for (let fld = 0; fld < data.length; ++fld) {
        destination[names[fld]] = data[fld]
      }
      callback(destination)
    })
  }

  get(length: number, callback: (data: Buffer) => void) {
    this.read_queue.push(new ReadFixedRequest(length, callback))
    this.resume()
  }

  resume() {
    if (this.resumed)
      return
    this.resumed = true
    // process all read requests until enough data in the buffer
    while (this.read_queue[0].execute(this)) {
      this.read_queue.shift()
      if (this.read_queue.length == 0)
        return
    }
    this.resumed = false
  }

  getbyte() {
    let res = 0
    const b = this.readlist[0]
    if (this.offset + 1 < b.length) {
      res = b[this.offset]
      this.offset++
      this.length--

    } else {

      // last byte in current buffer, shift read list
      res = b[this.offset]
      this.readlist.shift()
      this.length--
      this.offset = 0
    }
    return res
  }

  pack(format: string, args: any[]) {
    let packetlength = 0

    let arg = 0
    for (let i = 0; i < format.length; ++i) {
      const f = format[i]
      if (f == ProtocolFormat.x) {
        packetlength++
      } else if (f === ProtocolFormat.p) {
        packetlength += padded_length(args[arg++].length)
      } else if (f === ProtocolFormat.a) {
        packetlength += args[arg].length
        arg++
      } else {
        // this is a fixed-length format, get length from argument_length table
        packetlength += argument_length[f]
        arg++
      }
    }

    const buf = Buffer.alloc(packetlength)
    let offset = 0
    arg = 0
    for (let i = 0; i < format.length; ++i) {
      switch (format[i]) {
        case ProtocolFormat.x: {
          buf[offset++] = 0
          break
        }
        case ProtocolFormat.C: {
          const n = args[arg++]
          buf[offset++] = n
          break
        }
        case ProtocolFormat.s: {
          const n = args[arg++]
          buf.writeInt16LE(n, offset)
          offset += 2
          break
        }
        case ProtocolFormat.S: {
          const n = args[arg++]
          buf[offset++] = n & 0xff
          buf[offset++] = (n >> 8) & 0xff
          break
        }
        case ProtocolFormat.l: {
          const n = args[arg++]
          buf.writeInt32LE(n, offset)
          offset += 4
          break
        }
        case ProtocolFormat.L: {
          const n = args[arg++]
          buf[offset++] = n & 0xff
          buf[offset++] = (n >> 8) & 0xff
          buf[offset++] = (n >> 16) & 0xff
          buf[offset++] = (n >> 24) & 0xff
          break
        }
        case ProtocolFormat.a: {  // string, buffer, or array
          const str = args[arg++]
          if (Buffer.isBuffer(str)) {
            str.copy(buf, offset)
            offset += str.length
          } else if (Array.isArray(str)) {
            for (let item of str) buf[offset++] = item
          } else {
            // TODO: buffer.write could be faster
            for (let c = 0; c < str.length; ++c) {
              buf[offset++] = str.charCodeAt(c)
            }
          }
          break
        }
        case ProtocolFormat.p: {  // padded string
          const str = args[arg++]
          const len = padded_length(str.length)
          // TODO: buffer.write could be faster
          let c = 0
          for (; c < str.length; ++c)
            buf[offset++] = str.charCodeAt(c)
          for (; c < len; ++c)
            buf[offset++] = 0
          break
        }
      }
    }
    this.write_queue.push(buf)
    this.write_length += buf.length
    return this
  }

  flush() {
    // TODO: measure performance benefit of
    // creating and writing one big concatenated buffer

    // TODO: check write result
    // pause/resume streaming
    for (let i = 0; i < this.write_queue.length; ++i) {
      //stream.write(this.write_queue[i])
      this.emit('data', this.write_queue[i])
    }
    this.write_queue = []
    this.write_length = 0
  }
}
