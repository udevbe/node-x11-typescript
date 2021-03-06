import { Buffer } from 'buffer'

declare global {
  interface Buffer {
    unpack(format: string, offset?: number): number[]

    unpackString(n: number, offset: number): string
  }
}

Buffer.prototype.unpack = function(format: string, offset: number = 0): number[] {
  if (!offset) {
    offset = 0
  }

  const data: number[] = []
  let currentArg: number = 0
  while (currentArg < format.length) {
    const arg = format[currentArg]
    switch (arg) {
      case 'C':
        data.push(this.readUInt8(offset++))
        break
      case 'c':
        data.push(this.readInt8(offset++))
        break
      case 'S':
        data.push(this.readUInt16LE(offset))
        offset += 2
        break
      case 's':
        data.push(this.readInt16LE(offset))
        offset += 2
        break
      case 'n':
        data.push(this.readUInt16BE(offset))
        offset += 2
        break
      case 'L':
        data.push(this.readUInt32LE(offset))
        offset += 4
        break
      case 'l':
        data.push(this.readInt32LE(offset))
        offset += 4
        break
      case 'x':
        offset++
        break
    }
    currentArg++
  }
  return data
}

Buffer.prototype.unpackString = function(n: number, offset: number): string {
  let res = ''
  const end = offset + n
  while (offset < end) {
    res += String.fromCharCode(this[offset++])
  }
  return res
}
