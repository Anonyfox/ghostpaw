import { chmodSync, readFileSync } from "node:fs";
import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

// CJS deps (grammy) use require("http") etc. In ESM output, esbuild's __require
// shim throws because `require` is undefined. Injecting createRequire makes the
// real require() available so CJS interop works.
const BANNER = [
  "#!/usr/bin/env node",
  "import { createRequire as __createRequire } from 'node:module';",
  "const require = __createRequire(import.meta.url);",
].join("\n");

// grammY depends on node-fetch, but the bundled polyfill's Request class rejects
// Node's native AbortSignal (instanceof mismatch). Since Node 22 has native fetch,
// we replace the polyfill with re-exports of the built-in globals.
const nativeFetchPlugin = {
  name: "native-fetch",
  setup(build) {
    build.onResolve({ filter: /^node-fetch$/ }, () => ({
      path: "node-fetch",
      namespace: "native-fetch",
    }));
    build.onLoad({ filter: /.*/, namespace: "native-fetch" }, () => ({
      contents: [
        "const _f = globalThis.fetch;",
        "const _R = globalThis.Request;",
        "const _Rs = globalThis.Response;",
        "const _H = globalThis.Headers;",
        "export default _f;",
        "export { _f as fetch, _R as Request, _Rs as Response, _H as Headers };",
      ].join("\n"),
      loader: "js",
    }));
  },
};

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22.5",
  outfile: "dist/ghostpaw.mjs",
  banner: { js: BANNER },
  plugins: [nativeFetchPlugin],
  define: { __VERSION__: JSON.stringify(pkg.version) },
  minify: false,
  sourcemap: false,
  metafile: true,
  logLevel: "warning",
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log("watching for changes...");
} else {
  const result = await build(buildOptions);
  chmodSync("dist/ghostpaw.mjs", 0o755);

  const out = Object.entries(result.metafile.outputs)[0];
  const kb = (out[1].bytes / 1024).toFixed(1);
  console.log(`built ${out[0]} (${kb} KB)`);
}
