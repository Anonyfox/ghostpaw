#!/usr/bin/env node

/**
 * Generates Tauri app icons from the ghostpaw logo.
 * Uses sips (macOS) or ImageMagick (cross-platform) to create:
 * - 32x32, 128x128, 256x256 PNGs
 * - icon.icns (macOS)
 * - icon.ico (Windows)
 *
 * Run: node desktop/scripts/generate-icons.mjs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const SOURCE = join(ROOT, "assets/ghostpaw-logo.png");
const ICONS_DIR = join(ROOT, "desktop/src-tauri/icons");
const TMP = join(ICONS_DIR, "_tmp");

if (!existsSync(SOURCE)) {
  console.error("Source image not found:", SOURCE);
  process.exit(1);
}

mkdirSync(ICONS_DIR, { recursive: true });
mkdirSync(TMP, { recursive: true });

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function hasTool(name) {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const useSips = process.platform === "darwin" && hasTool("sips");
const useConvert = hasTool("convert");

if (!useSips && !useConvert) {
  console.error("Need either sips (macOS) or ImageMagick (convert) to generate icons.");
  process.exit(1);
}

// Step 1: Create a 1024x1024 square with the wolf centered on dark background
const square = join(TMP, "square-1024.png");
if (useSips) {
  // Crop to center 1024x1024 from the 1536x1024 source
  const cropped = join(TMP, "cropped.png");
  run(`sips -c 1024 1024 "${SOURCE}" --out "${cropped}"`);
  // The sips -c pads/crops to the target. Since source is 1536x1024, it centers and crops width.
  run(`cp "${cropped}" "${square}"`);
} else {
  run(`convert "${SOURCE}" -gravity center -background "#0d1117" -extent 1024x1024 "${square}"`);
}

// Step 2: Generate sized PNGs
const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
];

for (const { name, size } of sizes) {
  const out = join(ICONS_DIR, name);
  if (useSips) {
    run(`sips -z ${size} ${size} "${square}" --out "${out}"`);
  } else {
    run(`convert "${square}" -resize ${size}x${size} "${out}"`);
  }
}

// Step 3: Generate .icns (macOS)
if (process.platform === "darwin") {
  const iconsetDir = join(TMP, "icon.iconset");
  mkdirSync(iconsetDir, { recursive: true });

  const icnsSizes = [16, 32, 64, 128, 256, 512];
  for (const s of icnsSizes) {
    const out1x = join(iconsetDir, `icon_${s}x${s}.png`);
    const out2x = join(iconsetDir, `icon_${s}x${s}@2x.png`);
    if (useSips) {
      run(`sips -z ${s} ${s} "${square}" --out "${out1x}"`);
      run(`sips -z ${s * 2} ${s * 2} "${square}" --out "${out2x}"`);
    } else {
      run(`convert "${square}" -resize ${s}x${s} "${out1x}"`);
      run(`convert "${square}" -resize ${s * 2}x${s * 2} "${out2x}"`);
    }
  }

  run(`iconutil -c icns "${iconsetDir}" -o "${join(ICONS_DIR, "icon.icns")}"`);
}

// Step 4: Generate .ico (Windows — best effort with ImageMagick, skip on macOS-only)
if (useConvert) {
  const icoSizes = [16, 24, 32, 48, 64, 128, 256].map(
    (s) => `\\( "${square}" -resize ${s}x${s} \\)`,
  );
  run(`convert ${icoSizes.join(" ")} "${join(ICONS_DIR, "icon.ico")}"`);
} else {
  // Create a placeholder .ico from the 32x32 png
  const png32 = join(ICONS_DIR, "32x32.png");
  if (existsSync(png32)) {
    run(`cp "${png32}" "${join(ICONS_DIR, "icon.ico")}"`);
  }
}

// Cleanup
rmSync(TMP, { recursive: true, force: true });

console.log("Icons generated in", ICONS_DIR);
