import { Buffer } from 'buffer'
import { EventEmitter } from 'events'
import net from 'net'
import os from 'os'
import coreRequests from './corereqs'
import { readServerHello, writeClientHello } from './handshake'
import { StdAtoms, stdAtoms } from './stdatoms'
import { PackStream } from './unpackstream'
import { xErrors } from './xerrors'

export interface XConnectionOptions {
  xAuthority: string,
  display: string,
  debug: boolean
}

export interface XDisplay {

}

export interface XVisual {

}

export function stash() {
  require('./ext/apple-wm')
  require('./ext/big-requests')
  require('./ext/composite')
  require('./ext/damage')
  require('./ext/dpms')
  require('./ext/fixes')
  require('./ext/glxconstants')
  require('./ext/glx')
  require('./ext/glxrender')
  require('./ext/randr')
  require('./ext/render')
  require('./ext/screen-saver')
  require('./ext/shape')
  require('./ext/xc-misc')
  require('./ext/xtest')
}

export class XClient extends EventEmitter {
  private readonly options: XConnectionOptions
  private core_requests: {}
  private ext_requests: {}
  private readonly displayNum: string
  private screenNum: string

  private stream?: net.Socket
  private authHost?: string
  private authFamily?: string
  private pack_stream: PackStream = new PackStream()
  private rsrc_id = 0
  private seq_num_ = 0
  private seq2stack: { [key: number]: Error } = {}
  private replies = {}
  private atoms: (Readonly<StdAtoms> | { [key: string]: number }) = stdAtoms
  private atom_names: { [key: number]: string } = (() => {
    const names: { [key: number]: string } = {}
    Object.keys(stdAtoms).forEach((key) => {
      names[stdAtoms[key as keyof StdAtoms] as number] = key
    })
    return names
  })()
  private event_consumers = {} // maps window id to eventemitter TODO: bad name
  private eventParsers = {}
  private errorParsers = {}
  private _extensions = {}
  private _closing = false
  private _unusedIds = []
  private pending_atoms = {}

  constructor(displayNum: string, screenNum: string, options: XConnectionOptions) {
    super()
    this.options = options
    this.core_requests = {}
    this.ext_requests = {}

    this.displayNum = displayNum
    this.screenNum = screenNum
  }

  set seq_num(v: number) {
    this.seq_num_ = v
    if (this.options.debug) {
      const err = new Error()
      Error.captureStackTrace(err, arguments.callee)
      err.timestamp = Date.now()
      this.seq2stack[this.seq_num] = err
    }
  }

  get seq_num(): number {
    return this.seq_num_
  }

  init(stream: net.Socket) {
    this.stream = stream

    this.authHost = stream.remoteAddress
    // Node v0.10.x does not have stream.remoteFamily, so dig in to find it
    this.authFamily = stream._getpeername ? stream._getpeername().family : stream.remoteFamily
    if (!this.authHost || this.authHost === '127.0.0.1' || this.authHost === '::1') {
      this.authHost = os.hostname()
      this.authFamily = undefined
    }

    const pack_stream = new PackStream()

    // data received from stream is dispached to
    // read requests set by calls to .unpack and .unpackTo
    //stream.pipe(pack_stream);

    // pack_stream write requests are buffered and
    // flushed to stream as result of call to .flush
    // TODO: listen for drain event and flush automatically
    //pack_stream.pipe(stream);
    pack_stream.on('data', data => stream.write(data))
    stream.on('data', data => pack_stream.write(data))
    stream.on('end', () => this.emit('end'))

    this.pack_stream = pack_stream


    this.importRequestsFromTemplates(this, coreRequests)

    this.startHandshake()
  }

  // TODO: close() = set 'closing' flag, watch it in replies and writeQueue, terminate if empty
  terminate() {
    this.stream?.end()
  }

  // GetAtomName used as cheapest non-modifying request with reply
// 3 - id for shortest standard atom, "ARC"
  ping(cb) {
    const start = Date.now()
    this.GetAtomName(3, (err, str) => {
      if (err) return cb(err)
      return cb(null, Date.now() - start)
    })
  }

  close(cb) {
    const cli = this
    cli.ping(err => {
      if (err) return cb(err)
      cli.terminate()
      if (cb) cb()
    })
    cli._closing = true
  }

  importRequestsFromTemplates(target, reqs) {
    const client = this
    this.pending_atoms = {}
    for (let r in reqs) {
      // r is request name
      target[r] = (function(reqName) {

        const reqFunc = function req_proxy() {

          if (client._closing)
            throw new Error('client is in closing state')

          // simple overflow handling (this means that currently there is no way to have more than 65535 requests in the queue
          // TODO: edge cases testing
          if (client.seq_num == 65535)
            client.seq_num = 0
          else
            client.seq_num++

          // is it fast?
          const args = Array.prototype.slice.call(req_proxy.arguments)

          let callback = args.length > 0 ? args[args.length - 1] : null
          if (callback && callback.constructor.name != 'Function')
            callback = null

          // TODO: see how much we can calculate in advance (not in each request)
          const reqReplTemplate = reqs[reqName]
          const reqTemplate = reqReplTemplate[0]
          let templateType: string = typeof reqTemplate

          if (templateType === 'object')
            templateType = reqTemplate.constructor.name

          if (templateType === 'function') {
            if (reqName === 'InternAtom') {
              const value = req_proxy.arguments[1]
              if (client.atoms[value]) {
                --client.seq_num
                return setImmediate(function() {
                  callback(undefined, client.atoms[value])
                })
              } else {
                client.pending_atoms[client.seq_num] = value
              }
            }

            // call template with input arguments (not including callback which is last argument TODO currently with callback. won't hurt)
            //reqPack = reqTemplate.call(args);
            const reqPack = reqTemplate.apply(this, req_proxy.arguments)
            var format = reqPack[0]
            var requestArguments = reqPack[1]

            if (callback)
              this.replies[this.seq_num] = [reqReplTemplate[1], callback]

            client.pack_stream.pack(format, requestArguments)
            const b = client.pack_stream.write_queue[0]
            client.pack_stream.flush()

          } else if (templateType === 'Array') {
            if (reqName === 'GetAtomName') {
              const atom = req_proxy.arguments[0]
              if (client.atom_names[atom]) {
                --client.seq_num
                return setImmediate(function() {
                  callback(undefined, client.atom_names[atom])
                })
              } else {
                client.pending_atoms[client.seq_num] = atom
              }
            }

            var format = reqTemplate[0]
            var requestArguments = []

            for (var a = 0; a < reqTemplate[1].length; ++a)
              requestArguments.push(reqTemplate[1][a])
            for (var a in args)
              requestArguments.push(args[a])

            if (callback)
              this.replies[this.seq_num] = [reqReplTemplate[1], callback]

            client.pack_stream.pack(format, requestArguments)
            client.pack_stream.flush()
          } else {
            throw 'unknown request format - ' + templateType
          }
        }
        return reqFunc
      })(r)
    }
  }

  AllocID() {
    if (this._unusedIds.length > 0) {
      return this._unusedIds.pop()
    }
    // TODO: handle overflow (XCMiscGetXIDRange from XC_MISC ext)
    this.display.rsrc_id++
    return (this.display.rsrc_id << this.display.rsrc_shift) + this.display.resource_base
  }

  ReleaseID(id) {
    this._unusedIds.push(id)
  }

  unpackEvent(type, seq, extra, code, raw, headerBuf) {
    const event = {} // TODO: constructor & base functions
    // Remove the most significant bit. See Chapter 1, Event Format section in X11 protocol
    // specification
    type = type & 0x7F
    event.type = type
    event.seq = seq

    const extUnpacker = this.eventParsers[type]
    if (extUnpacker) {
      return extUnpacker(type, seq, extra, code, raw)
    }

    if (type == 2 || type == 3 || type == 4 || type == 5 || type == 6) { // motion event
      var values = raw.unpack('LLLssssSC')
      //event.raw = values;
      // TODO: use unpackTo???
      event.name = [, , 'KeyPress', 'KeyRelease', 'ButtonPress', 'ButtonRelease', 'MotionNotify'][type]
      event.time = extra
      event.keycode = code
      event.root = values[0]
      event.wid = values[1]
      event.child = values[2]
      event.rootx = values[3]
      event.rooty = values[4]
      event.x = values[5]
      event.y = values[6]
      event.buttons = values[7]
      event.sameScreen = values[8]
    } else if (type == 7 || type == 8) { //EnterNotify || LeaveNotify
      event.name = type === 7 ? 'EnterNotify' : 'LeaveNotify'
      var values = raw.unpack('LLLssssSC')
      event.root = values[0]
      event.wid = values[1]
      event.child = values[2]
      event.rootx = values[3]
      event.rooty = values[4]
      event.x = values[5]
      event.y = values[6]
      event.values = values

    } else if (type == 12) { // Expose
      var values = raw.unpack('SSSSS')
      event.name = 'Expose'
      event.wid = extra
      event.x = values[0]
      event.y = values[1]
      event.width = values[2]
      event.height = values[3]
      event.count = values[4] // TODO: ???
    } else if (type == 16) { // CreateNotify
      var values = raw.unpack('LssSSSc')
      event.name = 'CreateNotify'
      event.parent = extra
      event.wid = values[0]
      event.x = values[1]
      event.y = values[2]
      event.width = values[3]
      event.height = values[4]
      event.borderWidth = values[5]
      event.overrideRedirect = values[6] ? true : false
      // x, y, width, height, border
    } else if (type == 17) { // destroy notify
      var values = raw.unpack('L')
      event.name = 'DestroyNotify'
      event.event = extra
      event.wid = values[0]
    } else if (type == 18) { // UnmapNotify
      var values = raw.unpack('LC')
      event.name = 'UnmapNotify'
      event.event = extra
      event.wid = values[0]
      event.fromConfigure = values[1] ? true : false
    } else if (type == 19) { // MapNotify
      var values = raw.unpack('LC')
      event.name = 'MapNotify'
      event.event = extra
      event.wid = values[0]
      event.overrideRedirect = values[1] ? true : false
    } else if (type == 20) {
      var values = raw.unpack('L')
      event.name = 'MapRequest'
      event.parent = extra
      event.wid = values[0]
    } else if (type == 22) {
      var values = raw.unpack('LLssSSSC')
      event.name = 'ConfigureNotify'
      event.wid = extra
      // TODO rename
      event.wid1 = values[0]
      event.aboveSibling = values[1]
      event.x = values[2]
      event.y = values[3]
      event.width = values[4]
      event.height = values[5]
      event.borderWidth = values[6]
      event.overrideRedirect = values[7]
    } else if (type == 23) {
      var values = raw.unpack('LLssSSSS')
      event.name = 'ConfigureRequest'
      event.stackMode = code
      event.parent = extra
      event.wid = values[0]
      event.sibling = values[1]
      event.x = values[2]
      event.y = values[3]
      event.width = values[4]
      event.height = values[5]
      event.borderWidth = values[6]
      //
      // The value-mask indicates which components were specified in
      // the request. The value-mask and the corresponding values are reported as given
      // in the request. The remaining values are filled in from the current geometry of the
      // window, except in the case of sibling and stack-mode, which are reported as None
      // and Above (respectively) if not given in the request.
      event.mask = values[6]
      // 322, [ 12582925, 0, 0, 484, 316, 1, 12, 0
      //console.log([extra, code, values]);
    } else if (type == 28) {// PropertyNotify
      event.name = 'PropertyNotify'
      var values = raw.unpack('LLC')
      event.wid = extra
      event.atom = values[0]
      event.time = values[1]
      event.state = values[2]
    } else if (type == 29) {// SelectionClear
      event.name = 'SelectionClear'
      event.time = extra
      var values = raw.unpack('LL')
      event.owner = values[0]
      event.selection = values[1]
    } else if (type == 30) {// SelectionRequest
      event.name = 'SelectionRequest'
      // TODO check this
      event.time = extra
      var values = raw.unpack('LLLLL')
      event.owner = values[0]
      event.requestor = values[1]
      event.selection = values[2]
      event.target = values[3]
      event.property = values[4]
    } else if (type == 31) {// SelectionNotify
      event.name = 'SelectionNotify'
      // TODO check this
      event.time = extra
      var values = raw.unpack('LLLL')
      event.requestor = values[0]
      event.selection = values[1]
      event.target = values[2]
      event.property = values[3]
    } else if (type == 33) {// ClientMessage
      event.name = 'ClientMessage'
      event.format = code
      event.wid = extra
      event.message_type = raw.unpack('L')[0]
      const format = (code === 32) ? 'LLLLL' : (code === 16) ? 'SSSSSSSSSS' : 'CCCCCCCCCCCCCCCCCCCC'
      event.data = raw.unpack(format, 4)
    } else if (type == 34) {
      event.name = 'MappingNotify'
      event.request = headerBuf[4]
      event.firstKeyCode = headerBuf[5]
      event.count = headerBuf[6]
    }
    return event
  }

  expectReplyHeader() {
    // TODO: move error parsers to corereqs.js

    this.pack_stream.get(8, function(headerBuf) {
        const res = headerBuf.unpack('CCSL')
        const type = res[0]
        const seq_num = res[2]
        const bad_value = res[3]

        if (type == 0) {
          const error_code = res[1]
          const error = new Error()
          error.error = error_code
          error.seq = seq_num
          if (this.options.debug) {
            error.longstack = this.seq2stack[error.seq]
            console.log(this.seq2stack[error.seq].stack)
          }

          // unpack error packet (32 bytes for all error types, 8 of them in CCSL header)
          this.pack_stream.get(24, function(buf) {

            const res = buf.unpack('SC')
            error.message = xErrors.errorText[error_code]
            error.badParam = bad_value
            error.minorOpcode = res[0]
            error.majorOpcode = res[1]

            const extUnpacker = this.errorParsers[error_code]
            if (extUnpacker) {
              extUnpacker(error, error_code, seq_num, bad_value, buf)
            }

            const handler = this.replies[seq_num]
            if (handler) {
              const callback = handler[1]
              const handled = callback(error)
              if (!handled)
                this.emit('error', error)
              // TODO: should we delete seq2stack and reply even if there is no handler?
              if (this.options.debug)
                delete this.seq2stack[seq_num]
              delete this.replies[seq_num]
            } else
              this.emit('error', error)
            this.expectReplyHeader()
          })
          return
        } else if (type > 1) {
          this.pack_stream.get(24, function(buf) {
            const extra = res[3]
            const code = res[1]
            const ev = this.unpackEvent(type, seq_num, extra, code, buf, headerBuf)

            // raw event 32-bytes packet (primarily for use in SendEvent);
            // TODO: Event::pack based on event parameters, inverse to unpackEvent
            ev.rawData = Buffer.alloc(32)
            headerBuf.copy(ev.rawData)
            buf.copy(ev.rawData, 8)

            this.emit('event', ev)
            let ee = this.event_consumers[ev.wid]
            if (ee) {
              ee.emit('event', ev)
            }
            if (ev.parent) {
              ee = this.event_consumers[ev.parent]
              if (ee)
                ee.emit('child-event', ev)
            }
            this.expectReplyHeader()
          })
          return
        }

        let opt_data = res[1]
        const length_total = res[3]            // in 4-bytes units, _including_ this header
        const bodylength = 24 + length_total * 4 // 24 is rest if 32-bytes header

        this.pack_stream.get(bodylength, function(data) {

          const handler = this.replies[seq_num]
          if (handler) {
            const unpack = handler[0]
            if (this.pending_atoms[seq_num]) {
              opt_data = seq_num
            }

            const result = unpack.call(this, data, opt_data)
            const callback = handler[1]
            callback(null, result)
            // TODO: add multiple replies flag and delete handler only after last reply (eg ListFontsWithInfo)
            delete this.replies[seq_num]
          }
          // wait for new packet from server
          this.expectReplyHeader()
        })
      }
    )
  }

  startHandshake() {
    writeClientHello(this.pack_stream, this.displayNum, this.authHost, this.authFamily, this.options)
    readServerHello(this.pack_stream, (err, display) => {
      if (err) {
        this.emit('error', err)
        return
      }
      this.expectReplyHeader()
      this.display = display
      display.client = this
      this.emit('connect', display)
    })
  }

  require(extName, callback) {
    let ext = this._extensions[extName]
    if (ext) {
      return process.nextTick(() => {
        callback(null, ext)
      })
    }

    ext = require('./ext/' + extName)
    ext.requireExt(this.display, (err, _ext) => {
      if (err) {
        return callback(err)
      }

      this._extensions[extName] = _ext
      callback(null, _ext)
    })
  }
}


export function createClient(options, initCb) {
  if (typeof options === 'function') {
    initCb = options
    options = {}
  }

  if (!options) options = {}

  let display = options.display
  if (!display)
    display = (process.env.DISPLAY) ? process.env.DISPLAY : ':0'

  const displayMatch = display.match(/^(?:[^:]*?\/)?(.*):(\d+)(?:.(\d+))?$/)
  if (!displayMatch)
    throw new Error('Cannot parse display')

  const host = displayMatch[1]

  let displayNum = displayMatch[2]
  if (!displayNum)
    displayNum = 0
  let screenNum = displayMatch[3]
  if (!screenNum)
    screenNum = 0

  // open stream
  let stream
  const connected = false
  let cbCalled = false
  let socketPath

  // try local socket on non-windows platforms
  if (['cygwin', 'win32', 'win64'].indexOf(process.platform) < 0) {
    if (process.platform == 'darwin' || process.platform == 'mac') {
      // socket path on OSX is /tmp/launch-(some id)/org.x:0
      if (display[0] == '/') {
        socketPath = display
      }
    } else if (!host)
      socketPath = '/tmp/.X11-unix/X' + displayNum
  }
  const client = new XClient(displayNum, screenNum, options)

  const connectStream = function() {
    if (socketPath) {
      stream = net.createConnection(socketPath)
    } else {
      stream = net.createConnection(6000 + parseInt(displayNum), host)
    }
    stream.on('connect', function() {
      connected = true
      client.init(stream)
    })
    stream.on('error', function(err) {
      if (!connected && socketPath && err.code === 'ENOENT') {
        // Retry connection with TCP on localhost
        socketPath = null
        host = 'localhost'
        connectStream()
      } else if (initCb && !cbCalled) {
        cbCalled = true
        initCb(err)
      } else {
        client.emit('error', err)
      }
    })
  }
  connectStream()
  if (initCb) {
    client.on('connect', function(display) {
      // opt-in BigReq
      if (!options.disableBigRequests) {
        client.require('big-requests', function(err, BigReq) {
          if (err)
            return initCb(err)
          BigReq.Enable(function(err, maxLen) {
            display.max_request_length = maxLen
            cbCalled = true
            initCb(undefined, display)
          })
        })
      } else {
        cbCalled = true
        initCb(undefined, display)
      }
    })
  }
  return client
}
