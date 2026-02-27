import { ok, strictEqual, throws } from "node:assert";
import { describe, it } from "node:test";
import { bufferToVector } from "./buffer_to_vector.ts";
import { vectorToBuffer } from "./vector_to_buffer.ts";

describe("bufferToVector", () => {
  it("converts a Buffer to Float32Array", () => {
    const buf = vectorToBuffer([1.0, 2.0, 3.0]);
    const vec = bufferToVector(buf);
    ok(vec instanceof Float32Array);
    strictEqual(vec.length, 3);
  });

  it("handles empty buffer", () => {
    const vec = bufferToVector(new Uint8Array(0));
    strictEqual(vec.length, 0);
  });

  it("handles Uint8Array input (not Buffer)", () => {
    const original = [0.25, 0.75, -0.5];
    const f32 = new Float32Array(original);
    const u8 = new Uint8Array(f32.buffer);
    const restored = bufferToVector(u8);
    strictEqual(restored.length, 3);
    for (let i = 0; i < original.length; i++) {
      ok(
        Math.abs(restored[i] - original[i]) < 1e-6,
        `index ${i}: ${restored[i]} vs ${original[i]}`,
      );
    }
  });

  it("roundtrips through vectorToBuffer", () => {
    const original = [-1.0, 0.0, 0.5, 0.999];
    const vec = bufferToVector(vectorToBuffer(original));
    strictEqual(vec.length, original.length);
    for (let i = 0; i < original.length; i++) {
      ok(Math.abs(vec[i] - original[i]) < 1e-6);
    }
  });

  it("throws on non-aligned byte length", () => {
    throws(() => bufferToVector(new Uint8Array(5)), RangeError);
    throws(() => bufferToVector(new Uint8Array(7)), RangeError);
  });
});
