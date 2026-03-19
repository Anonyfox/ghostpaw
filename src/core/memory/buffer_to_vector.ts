export function bufferToVector(buf: Uint8Array): Float32Array {
  if (buf.byteLength === 0) return new Float32Array(0);
  if (buf.byteLength % 4 !== 0) {
    throw new RangeError(`Buffer byte length must be a multiple of 4, got ${buf.byteLength}`);
  }
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}
