import { ok, strictEqual } from "node:assert";
import { describe, it } from "node:test";
import { bufferToVector } from "./buffer_to_vector.ts";
import { vectorToBuffer } from "./vector_to_buffer.ts";

describe("vectorToBuffer", () => {
  it("returns a Buffer", () => {
    const buf = vectorToBuffer([1.0, 2.0, 3.0]);
    ok(Buffer.isBuffer(buf));
  });

  it("produces correct byte length (4 bytes per float32)", () => {
    const buf = vectorToBuffer([1.0, 2.0, 3.0]);
    strictEqual(buf.byteLength, 12);
  });

  it("handles empty array", () => {
    const buf = vectorToBuffer([]);
    strictEqual(buf.byteLength, 0);
  });

  it("roundtrips through bufferToVector", () => {
    const original = [0.1, 0.5, -0.3, 0.0, 1.0];
    const buf = vectorToBuffer(original);
    const restored = bufferToVector(buf);
    strictEqual(restored.length, original.length);
    for (let i = 0; i < original.length; i++) {
      ok(
        Math.abs(restored[i] - original[i]) < 1e-6,
        `index ${i}: ${restored[i]} vs ${original[i]}`,
      );
    }
  });

  it("preserves known float32 values", () => {
    const buf = vectorToBuffer([1.0]);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const val = view.getFloat32(0, true);
    strictEqual(val, 1.0);
  });
});
