/** Validate the complete raster container, not just a claimed MIME or dimensions.
 * Images stay bounded by the upload endpoint. SVG, animation, truncation and
 * trailing/polyglot payloads are rejected before storage. */
export function imageDimensions(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (at, n) => String.fromCharCode(...bytes.subarray(at, at + n));
  const valid = ({width, height}) => width > 0 && height > 0 && width <= 2400 && height <= 2400;
  if (bytes[0] === 137 && ascii(1, 7) === 'PNG\r\n\x1a\n') {
    let offset = 8, dimensions, data = false;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), type = ascii(offset + 4, 4);
      const end = offset + 12 + length;
      if (end > bytes.length || !/^[A-Za-z]{4}$/.test(type) || ['acTL', 'fcTL', 'fdAT'].includes(type)) return null;
      let crc = 0xffffffff;
      for (let i = offset + 4; i < end - 4; i++) {
        crc ^= bytes[i];
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
      if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(end - 4)) return null;
      if (offset === 8) {
        if (type !== 'IHDR' || length !== 13) return null;
        dimensions = {mime: 'image/png', width: view.getUint32(16), height: view.getUint32(20)};
        if (!valid(dimensions) || bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) return null;
      } else if (type === 'IHDR') return null;
      if (type === 'IDAT') data = true;
      if (type === 'IEND') return length === 0 && data && end === bytes.length ? dimensions : null;
      offset = end;
    }
    return null;
  }
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP' || view.getUint32(4, true) + 8 !== bytes.length) return null;
  let offset = 12, canvas, frame;
  while (offset + 8 <= bytes.length) {
    const type = ascii(offset, 4), size = view.getUint32(offset + 4, true), at = offset + 8;
    const end = at + size + (size & 1);
    if (end > bytes.length || ['ANIM', 'ANMF'].includes(type)) return null;
    if (type === 'VP8X') {
      if (offset !== 12 || size !== 10 || bytes[at] & 2) return null;
      canvas = {width: 1 + bytes[at + 4] + (bytes[at + 5] << 8) + (bytes[at + 6] << 16), height: 1 + bytes[at + 7] + (bytes[at + 8] << 8) + (bytes[at + 9] << 16)};
    }
    if (type === 'VP8 ' || type === 'VP8L') {
      if (frame) return null;
      if (type === 'VP8 ' && size >= 10 && ascii(at + 3, 3) === '\x9d\x01\x2a')
        frame = {width: view.getUint16(at + 6, true) & 16383, height: view.getUint16(at + 8, true) & 16383};
      else if (type === 'VP8L' && size >= 5 && bytes[at] === 47) {
        const bits = view.getUint32(at + 1, true);
        frame = {width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1};
      } else return null;
    }
    offset = end;
  }
  if (offset !== bytes.length || !frame || !valid(frame) || (canvas && (canvas.width !== frame.width || canvas.height !== frame.height))) return null;
  return {mime: 'image/webp', ...frame};
}
