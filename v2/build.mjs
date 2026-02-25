import { chmodSync, readFileSync } from "node:fs";
import { build, context } from "esbuild";

const isWatch = process.argv.includes("--watch");
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

const BANNER = [
  "#!/usr/bin/env node",
  "import { createRequire as __createRequire } from 'node:module';",
  "const require = __createRequire(import.meta.url);",
].join("\n");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22.5",
  outfile: "dist/ghostpaw.mjs",
  banner: { js: BANNER },
  plugins: [],
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
