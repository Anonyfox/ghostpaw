import type { IncomingMessage } from "node:http";

const DEFAULT_MAX_BYTES = 1_048_576;

export async function readJsonBody<T = unknown>(
  req: IncomingMessage,
  maxBytes = DEFAULT_MAX_BYTES,
): Promise<T> {
  const ct = req.headers["content-type"];
  if (!ct?.toLowerCase().trim().startsWith("application/json")) {
    throw new Error("Expected Content-Type: application/json.");
  }

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf-8");
    total += buf.length;
    if (total > maxBytes) {
      throw new Error(`Request body too large. Maximum: ${maxBytes} bytes.`);
    }
    chunks.push(buf);
  }

  const body = Buffer.concat(chunks).toString("utf-8");
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Request body is not valid JSON.");
  }
}
