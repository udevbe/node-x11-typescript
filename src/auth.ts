// TODO: differentiate between auth types (i.e., MIT-MAGIC-COOKIE-1 and XDM-AUTHORIZATION-1)
// and choose the best based on the algorithm in libXau's XauGetBestAuthByAddr

import * as fs from 'fs'
import { homedir as osHomedir } from 'os'
import * as path from 'path'
import './unpackbuffer'
import type { XConnectionOptions } from './xcore'
import ErrnoException = NodeJS.ErrnoException

// TODO use enum here?
export interface ConnectionTypeToName {
  256: 'Local',
  65535: 'Wild',
  254: 'Netname',
  253: 'Krb5Principal',
  252: 'LocalHost',
  0: 'Internet',
  1: 'DECnet',
  2: 'Chaos',
  5: 'ServerInterpreted',
  6: 'Internet6'
}

const connectionTypeToName: ConnectionTypeToName = {
  256: 'Local',
  65535: 'Wild',
  254: 'Netname',
  253: 'Krb5Principal',
  252: 'LocalHost',
  0: 'Internet',
  1: 'DECnet',
  2: 'Chaos',
  5: 'ServerInterpreted',
  6: 'Internet6'
}

export interface Cookie {
  type: keyof ConnectionTypeToName
  address: string
  display: string
  authName: string
  authData: string
}

const homedir: string = osHomedir()

function parseXauth(buf: Buffer): Cookie[] {
  let offset = 0
  const auth: Cookie[] = []
  const cookieProperties: (keyof Omit<Cookie, 'type'>)[] = ['address', 'display', 'authName', 'authData']

  while (offset < buf.length) {
    const type = buf.readUInt16BE(offset)
    if (!connectionTypeToName.hasOwnProperty(type)) {
      throw new Error('Unknown address type')
    }
    const cookie: Partial<Cookie> = {
      type: type as keyof ConnectionTypeToName
    }

    offset += 2
    cookieProperties.forEach((property) => {
      const length = buf.unpack('n', offset)[0]
      offset += 2
      if (cookie.type === 0 && property == 'address') { // Internet
        // 4 bytes of ip addess, convert to w.x.y.z string
        cookie.address = [
          buf[offset],
          buf[offset + 1],
          buf[offset + 2],
          buf[offset + 3]
        ].map(octet => octet.toString(10)).join('.')
      } else {
        cookie[property] = buf.unpackString(length, offset)
      }
      offset += length
    })
    auth.push(cookie as Cookie)
  }
  return auth
}


// TODO give options type of connection options
function readXauthority(cb: (err: ErrnoException | null, data?: Buffer) => void, options: XConnectionOptions): void {
  const nixFilename = options && options.xAuthority ? options.xAuthority : process.env.XAUTHORITY || path.join(homedir, '.Xauthority')
  fs.readFile(nixFilename, function(err, data) {
    if (!err)
      return cb(null, data)
    if (err.code == 'ENOENT') {
      // TODO we could solve this with recursion instead of c/p the readFile logic here from before
      // Xming/windows uses %HOME%/Xauthority ( .Xauthority with no dot ) - try with this name
      const winFilename = options?.xAuthority ?? process.env.XAUTHORITY ?? path.join(homedir, 'Xauthority')
      fs.readFile(winFilename, (err: ErrnoException | null, data?: Buffer) => {
        if (!err)
          return cb(null, data)
        if (err.code == 'ENOENT') {
          cb(null, undefined)
        } else {
          cb(err)
        }
      })
    } else {
      cb(err)
    }
  })
}

// TODO give options type of connection options
export default function(display: string, host: string, socketFamily: 'IPv4' | 'IPv6' | undefined, cb: (err: ErrnoException | null, cookie?: Pick<Cookie, 'authName'> & Pick<Cookie, 'authData'> & Partial<Cookie>) => void, options: XConnectionOptions): void {
  let family: keyof ConnectionTypeToName
  if (socketFamily === 'IPv4') {
    family = 0 // Internet
  } else if (socketFamily === 'IPv6') {
    family = 6 // Internet6
  } else {
    family = 256 // Local
  }

  readXauthority(function(err, data) {
    if (err) return cb(err)

    if (!data) {
      return cb(null, {
        authName: '',
        authData: ''
      })
    }
    const auth = parseXauth(data)
    for (let cookieNum in auth) {
      const cookie = auth[cookieNum]
      if ((connectionTypeToName[cookie.type] === 'Wild' || (cookie.type === family && cookie.address === host)) &&
        (cookie.display.length === 0 || cookie.display === display))
        return cb(null, cookie)
    }
    // If no cookie is found, proceed without authentication
    cb(null, {
      authName: '',
      authData: ''
    })
  }, options)
}
