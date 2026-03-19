import type { ConfigType, ConfigValue } from "./types.ts";

export function parseConfigValue(text: string, type: ConfigType): ConfigValue {
  switch (type) {
    case "string":
      return text;

    case "integer": {
      if (!/^-?\d+$/.test(text)) {
        throw new Error(`"${text}" is not a valid integer.`);
      }
      return Number.parseInt(text, 10);
    }

    case "number": {
      const n = Number(text);
      if (text.trim() === "" || !Number.isFinite(n)) {
        throw new Error(`"${text}" is not a valid number.`);
      }
      return n;
    }

    case "boolean": {
      if (text === "true") return true;
      if (text === "false") return false;
      throw new Error(`"${text}" is not a valid boolean. Use "true" or "false".`);
    }
  }
}
