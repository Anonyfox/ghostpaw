import { createHash } from "node:crypto";
import type { Duplex } from "node:stream";

const MAGIC_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const OP_TEXT = 0x1;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

export interface WsConnection {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: "message", handler: (data: string) => void): void;
  on(event: "close", handler: () => void): void;
}

export function upgradeToWebSocket(
  req: { headers: Record<string, string | string[] | undefined> },
  socket: Duplex,
  _head: Buffer,
): WsConnection | null {
  const key = req.headers["sec-websocket-key"];
  if (typeof key !== "string" || !key) return null;

  const accept = createHash("sha1")
    .update(key + MAGIC_GUID)
    .digest("base64");
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  (socket as unknown as { setNoDelay?: (v: boolean) => void }).setNoDelay?.(true);

  const handlers: { message: Array<(data: string) => void>; close: Array<() => void> } = {
    message: [],
    close: [],
  };
  let closed = false;

  function emit(event: "message" | "close", data?: string): void {
    for (const h of handlers[event]) {
      (h as (d?: string) => void)(data);
    }
  }

  function sendFrame(opcode: number, payload: Buffer): void {
    if (closed) return;
    const len = payload.length;
    let header: Buffer;
    if (len < 126) {
      header = Buffer.allocUnsafe(2);
      header[0] = 0x80 | opcode;
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.allocUnsafe(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.allocUnsafe(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    socket.write(header);
    if (len > 0) socket.write(payload);
  }

  function doClose(code = 1000, reason = ""): void {
    if (closed) return;
    closed = true;
    const reasonBuf = Buffer.from(reason, "utf8");
    const payload = Buffer.allocUnsafe(2 + reasonBuf.length);
    payload.writeUInt16BE(code, 0);
    reasonBuf.copy(payload, 2);
    sendFrame(OP_CLOSE, payload);
    socket.end();
    emit("close");
  }

  let buf = Buffer.alloc(0);

  socket.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= 2) {
      const frame = parseFrame(buf);
      if (!frame) break;
      buf = buf.subarray(frame.totalLength);

      switch (frame.opcode) {
        case OP_TEXT:
          emit("message", frame.payload.toString("utf8"));
          break;
        case OP_CLOSE:
          doClose(frame.payload.length >= 2 ? frame.payload.readUInt16BE(0) : 1000);
          return;
        case OP_PING:
          sendFrame(OP_PONG, frame.payload);
          break;
      }
    }
  });

  socket.on("close", () => {
    if (!closed) {
      closed = true;
      emit("close");
    }
  });

  socket.on("error", () => {
    if (!closed) {
      closed = true;
      emit("close");
    }
  });

  return {
    send(data: string) {
      sendFrame(OP_TEXT, Buffer.from(data, "utf8"));
    },
    close(code?: number, reason?: string) {
      doClose(code ?? 1000, reason ?? "");
    },
    on(event: "message" | "close", handler: ((data: string) => void) | (() => void)) {
      if (event === "message") {
        handlers.message.push(handler as (data: string) => void);
      } else {
        handlers.close.push(handler as () => void);
      }
    },
  };
}

interface ParsedFrame {
  opcode: number;
  payload: Buffer;
  totalLength: number;
}

function parseFrame(buf: Buffer): ParsedFrame | null {
  if (buf.length < 2) return null;

  const opcode = buf[0] & 0x0f;
  const isMasked = (buf[1] & 0x80) !== 0;
  let payloadLength = buf[1] & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buf.length < 4) return null;
    payloadLength = buf.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buf.length < 10) return null;
    payloadLength = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }

  if (isMasked) {
    if (buf.length < offset + 4 + payloadLength) return null;
    const maskKey = buf.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.allocUnsafe(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      payload[i] = buf[offset + i] ^ maskKey[i & 3];
    }
    return { opcode, payload, totalLength: offset + payloadLength };
  }

  if (buf.length < offset + payloadLength) return null;
  const payload = buf.subarray(offset, offset + payloadLength);
  return { opcode, payload, totalLength: offset + payloadLength };
}
