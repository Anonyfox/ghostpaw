let _gzipSync: ((buf: Buffer) => Buffer) | null = null;

async function loadGzip(): Promise<(buf: Buffer) => Buffer> {
  if (_gzipSync) return _gzipSync;
  const zlib = await import("node:zlib");
  _gzipSync = zlib.gzipSync as (buf: Buffer) => Buffer;
  return _gzipSync;
}

export async function compressionRatio(text: string): Promise<number> {
  if (text.length === 0) return 0;
  const gzip = await loadGzip();
  const original = Buffer.byteLength(text, "utf-8");
  const compressed = gzip(Buffer.from(text, "utf-8")).length;
  return compressed / original;
}
