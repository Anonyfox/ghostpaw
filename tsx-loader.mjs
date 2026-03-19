import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    if (result.url.endsWith(".tsx")) {
      return { ...result, format: "module", shortCircuit: true };
    }
    return result;
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".tsx")) {
      const source = readFileSync(fileURLToPath(url), "utf8");
      const { code } = transformSync(source, {
        loader: "tsx",
        jsx: "automatic",
        jsxImportSource: "preact",
      });
      return { source: code, format: "module", shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
