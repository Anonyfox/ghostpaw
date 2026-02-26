import type { ConfigType, ConfigValue } from "./types.ts";

export function serializeConfigValue(value: ConfigValue, type: ConfigType): string {
  switch (type) {
    case "string": {
      if (typeof value !== "string") {
        throw new Error(`Value must be a string, got ${typeof value}.`);
      }
      return value;
    }

    case "integer": {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error(`Value must be an integer, got ${String(value)}.`);
      }
      return String(value);
    }

    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Value must be a finite number, got ${String(value)}.`);
      }
      return String(value);
    }

    case "boolean": {
      if (typeof value !== "boolean") {
        throw new Error(`Value must be a boolean, got ${typeof value}.`);
      }
      return String(value);
    }
  }
}
