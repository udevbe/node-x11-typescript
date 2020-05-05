export function padded_length(len?: number): number {
  if (len) {
    return ((len + 3) >> 2) << 2
  } else {
    return 0
  }

  /*
  var rem = len % 4;
  var pl = len;
  if (rem)
      return len + 4 - rem;
  return len;
  */
}

// TODO: make it return buffer?
// str += is slow
export function padded_string(str: string) {
  if (str.length == 0)
    return ''

  const pad = padded_length(str.length) - str.length
  let res = str
  for (let i = 0; i < pad; ++i)
    res += String.fromCharCode(0)

  return res
}
