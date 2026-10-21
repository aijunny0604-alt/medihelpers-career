// Container validation before storage/decoding. The browser must also decode
// the pixels: headers alone cannot establish that compressed pixels are valid.
export function inspectUploadImage(input, contentType) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input || 0);
  const n = b.length;
  const text = (p, len) => String.fromCharCode(...b.subarray(p, p + len));
  const u16 = p => b[p] * 256 + b[p + 1];
  const le16 = p => b[p] + b[p + 1] * 256;
  const u32 = p => b[p] * 16777216 + b[p + 1] * 65536 + b[p + 2] * 256 + b[p + 3];
  const le32 = p => b[p] + b[p + 1] * 256 + b[p + 2] * 65536 + b[p + 3] * 16777216;
  const le24 = p => b[p] + b[p + 1] * 256 + b[p + 2] * 65536;
  const dimensions = (width, height) => Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width <= 24000 && height <= 24000 && width * height <= 32000000 ? { width, height } : null;
  if (contentType === 'image/png') {
    if (n < 45 || ![137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)) return null;
    let size = null, data = false;
    for (let p = 8; p + 12 <= n;) {
      const length = u32(p), kind = text(p + 4, 4), end = p + 12 + length;
      if (end > n) return null;
      if (p === 8) {
        if (kind !== 'IHDR' || length !== 13) return null;
        size = dimensions(u32(p + 8), u32(p + 12));
        if (!size) return null;
      } else if (kind === 'IHDR') return null;
      if (kind === 'IDAT' && length > 0) data = true;
      if (kind === 'IEND') return length === 0 && data && end === n ? size : null;
      p = end;
    }
    return null;
  }
  if (contentType === 'image/jpeg') {
    if (n < 16 || b[0] !== 255 || b[1] !== 216 || b[n-2] !== 255 || b[n-1] !== 217) return null;
    let size = null;
    for (let p = 2; p + 3 < n;) {
      if (b[p++] !== 255) return null;
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 0 || marker === 216 || marker === 217) return null;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (p + 2 > n) return null;
      const length = u16(p);
      if (length < 2 || p + length > n - 2) return null;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (length < 8) return null;
        size = dimensions(u16(p + 5), u16(p + 3));
        if (!size) return null;
      }
      if (marker === 218) return length >= 6 && p + length < n - 2 ? size : null;
      p += length;
    }
    return null;
  }
  if (contentType === 'image/webp') {
    if (n < 26 || text(0,4) !== 'RIFF' || text(8,4) !== 'WEBP' || le32(4) + 8 !== n) return null;
    let size = null, pixels = false;
    for (let p = 12; p + 8 <= n;) {
      const kind = text(p,4), length = le32(p+4), start = p+8, end = start+length;
      if (end + (length % 2) > n) return null;
      if (kind === 'VP8X') {
        if (length !== 10 || (b[start] & 2)) return null; // animated uploads use static artwork instead
        size = dimensions(le24(start+4)+1, le24(start+7)+1);
        if (!size) return null;
      } else if (kind === 'VP8 ') {
        if (length < 11 || b[start+3] !== 157 || b[start+4] !== 1 || b[start+5] !== 42) return null;
        const frame = dimensions(le16(start+6) & 16383, le16(start+8) & 16383);
        if (!frame || (size && (frame.width !== size.width || frame.height !== size.height))) return null;
        size ||= frame; pixels = true;
      } else if (kind === 'VP8L') {
        if (length < 6 || b[start] !== 47) return null;
        const packed = le32(start+1);
        const frame = dimensions((packed & 16383)+1, ((packed >>> 14) & 16383)+1);
        if (!frame || (size && (frame.width !== size.width || frame.height !== size.height))) return null;
        size ||= frame; pixels = true;
      }
      p = end + (length % 2);
      if (p === n) return pixels ? size : null;
    }
    return null;
  }
  if (contentType === 'image/gif') {
    if (n < 14 || !['GIF87a','GIF89a'].includes(text(0,6))) return null;
    const size = dimensions(le16(6), le16(8));
    if (!size) return null;
    let p = 13 + ((b[10] & 128) ? 3 * (2 ** ((b[10] & 7)+1)) : 0), pixels = false;
    const skipBlocks = () => {
      while (p < n) { const length = b[p++]; if (!length) return true; p += length; if (p > n) return false; }
      return false;
    };
    while (p < n) {
      const marker = b[p++];
      if (marker === 59) return pixels && p === n ? size : null;
      if (marker === 33) { p++; if (!skipBlocks()) return null; }
      else if (marker === 44) {
        if (p + 9 > n || !dimensions(le16(p+4), le16(p+6))) return null;
        const packed = b[p+8]; p += 9;
        if (packed & 128) p += 3 * (2 ** ((packed & 7)+1));
        if (p >= n || b[p] < 2 || b[p] > 8) return null;
        p++; const start = p;
        if (!skipBlocks() || p - start <= 1) return null;
        pixels = true;
      } else return null;
    }
  }
  return null;
}
