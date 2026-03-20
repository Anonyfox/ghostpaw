#!/usr/bin/env node

/**
 * Prepares the Node.js sidecar binary and ghostpaw.mjs for the Tauri build.
 *
 * Responsibilities:
 * 1. Determine the target triple (from TAURI_TARGET_TRIPLE env or rustc)
 * 2. Download the correct Node.js binary for the target
 * 3. For universal-apple-darwin: combine arm64 + x64 with lipo
 * 4. Rename to node-{target_triple} in src-tauri/binaries/
 * 5. Copy dist/ghostpaw.mjs to src-tauri/resources/
 * 6. Sync version from package.json into tauri.conf.json
 */

import { execSync } from "node:child_process";
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  chmodSync,
} from "node:fs";
import { get } from "node:https";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const NODE_VERSION = "v24.14.0";
const DESKTOP_ROOT = resolve(import.meta.dirname, "..");
const PROJECT_ROOT = resolve(DESKTOP_ROOT, "..");
const TAURI_DIR = join(DESKTOP_ROOT, "src-tauri");
const BIN_DIR = join(TAURI_DIR, "binaries");
const RES_DIR = join(TAURI_DIR, "resources");
const CACHE_DIR = join(DESKTOP_ROOT, ".cache");

mkdirSync(BIN_DIR, { recursive: true });
mkdirSync(RES_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });

const TRIPLE_MAP = {
  "aarch64-apple-darwin": { platform: "darwin", arch: "arm64", ext: "tar.gz" },
  "x86_64-apple-darwin": { platform: "darwin", arch: "x64", ext: "tar.gz" },
  "x86_64-unknown-linux-gnu": { platform: "linux", arch: "x64", ext: "tar.gz" },
  "aarch64-unknown-linux-gnu": { platform: "linux", arch: "arm64", ext: "tar.gz" },
  "x86_64-pc-windows-msvc": { platform: "win", arch: "x64", ext: "zip" },
};

function getTargetTriple() {
  if (process.env.TAURI_TARGET_TRIPLE) return process.env.TAURI_TARGET_TRIPLE;
  try {
    return execSync("rustc --print host-tuple", { encoding: "utf-8" }).trim();
  } catch {
    console.error("Cannot determine target triple. Set TAURI_TARGET_TRIPLE or install rustc.");
    process.exit(1);
  }
}

function nodeDownloadUrl(platform, arch) {
  const suffix = platform === "win" ? "zip" : "tar.gz";
  const name = `node-${NODE_VERSION}-${platform}-${arch}`;
  return `https://nodejs.org/dist/${NODE_VERSION}/${name}.${suffix}`;
}

function nodeBinaryPath(platform) {
  return platform === "win" ? "node.exe" : "bin/node";
}

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log(`  cached: ${dest}`);
    return;
  }
  const tmp = dest + ".tmp";
  console.log(`  downloading: ${url}`);
  const file = createWriteStream(tmp);
  await new Promise((resolve, reject) => {
    const fetch = (u) => {
      get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetch(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        pipeline(res, file).then(resolve).catch(reject);
      }).on("error", reject);
    };
    fetch(url);
  });
  renameSync(tmp, dest);
}

function extractNodeBinary(archivePath, platform, arch, outPath) {
  const name = `node-${NODE_VERSION}-${platform}-${arch}`;
  const binPath = nodeBinaryPath(platform);

  if (archivePath.endsWith(".zip")) {
    const extractDir = join(CACHE_DIR, "extracted");
    mkdirSync(extractDir, { recursive: true });
    if (process.platform === "win32") {
      execSync(
        `powershell -NoProfile -Command "Expand-Archive -Force '${archivePath}' '${extractDir}'"`,
        { stdio: "inherit" },
      );
    } else {
      execSync(`unzip -o -j "${archivePath}" "${name}/${binPath}" -d "${extractDir}"`, {
        stdio: "inherit",
      });
    }
    const extracted = join(extractDir, platform === "win" ? "node.exe" : "node");
    renameSync(extracted, outPath);
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${CACHE_DIR}" "${name}/${binPath}"`, {
      stdio: "inherit",
    });
    const extracted = join(CACHE_DIR, name, binPath);
    renameSync(extracted, outPath);
  }

  if (platform !== "win") {
    chmodSync(outPath, 0o755);
  }
}

async function prepareNodeBinary(triple) {
  const isUniversal = triple === "universal-apple-darwin";

  if (isUniversal) {
    console.log("Building universal macOS binary (arm64 + x64)...");
    const arm64Path = join(CACHE_DIR, "node-arm64");
    const x64Path = join(CACHE_DIR, "node-x64");

    if (!existsSync(arm64Path)) {
      const url = nodeDownloadUrl("darwin", "arm64");
      const archive = join(CACHE_DIR, `node-${NODE_VERSION}-darwin-arm64.tar.gz`);
      await download(url, archive);
      extractNodeBinary(archive, "darwin", "arm64", arm64Path);
    }

    if (!existsSync(x64Path)) {
      const url = nodeDownloadUrl("darwin", "x64");
      const archive = join(CACHE_DIR, `node-${NODE_VERSION}-darwin-x64.tar.gz`);
      await download(url, archive);
      extractNodeBinary(archive, "darwin", "x64", x64Path);
    }

    const universalPath = join(BIN_DIR, `node-${triple}`);
    console.log("  combining with lipo...");
    execSync(`lipo -create "${arm64Path}" "${x64Path}" -output "${universalPath}"`, {
      stdio: "inherit",
    });
    chmodSync(universalPath, 0o755);

    // Tauri validates externalBin per-arch, so create copies for each triple
    for (const archTriple of ["aarch64-apple-darwin", "x86_64-apple-darwin"]) {
      const archPath = join(BIN_DIR, `node-${archTriple}`);
      copyFileSync(universalPath, archPath);
      chmodSync(archPath, 0o755);
    }
    console.log("  created per-arch copies for Tauri validation");
    return;
  }

  const mapping = TRIPLE_MAP[triple];
  if (!mapping) {
    console.error(`Unknown target triple: ${triple}`);
    console.error("Known triples:", Object.keys(TRIPLE_MAP).join(", "));
    process.exit(1);
  }

  const { platform, arch, ext } = mapping;
  const archiveName = `node-${NODE_VERSION}-${platform}-${arch}.${ext}`;
  const archivePath = join(CACHE_DIR, archiveName);

  await download(nodeDownloadUrl(platform, arch), archivePath);

  const extracted = join(CACHE_DIR, `node-${platform}-${arch}`);
  if (!existsSync(extracted)) {
    extractNodeBinary(archivePath, platform, arch, extracted);
  }

  const suffix = platform === "win" ? ".exe" : "";
  const outPath = join(BIN_DIR, `node-${triple}${suffix}`);
  copyFileSync(extracted, outPath);
  if (platform !== "win") chmodSync(outPath, 0o755);
}

function copyGhostpawMjs() {
  const src = join(PROJECT_ROOT, "dist", "ghostpaw.mjs");
  const dest = join(RES_DIR, "ghostpaw.mjs");

  if (!existsSync(src)) {
    console.error("dist/ghostpaw.mjs not found. Run 'npm run build' first.");
    process.exit(1);
  }

  copyFileSync(src, dest);
  console.log("Copied ghostpaw.mjs to resources/");
}

function syncVersion() {
  const pkgPath = join(PROJECT_ROOT, "package.json");
  const tauriConfPath = join(TAURI_DIR, "tauri.conf.json");

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));

  if (conf.version !== pkg.version) {
    conf.version = pkg.version;
    writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + "\n");
    console.log(`Synced tauri.conf.json version to ${pkg.version}`);
  }
}

async function main() {
  const triple = getTargetTriple();
  console.log(`Target: ${triple}`);

  await prepareNodeBinary(triple);
  copyGhostpawMjs();
  syncVersion();

  console.log("Sidecar preparation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
