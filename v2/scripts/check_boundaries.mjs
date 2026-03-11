import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const NAMESPACED_CORE_FEATURES = new Set(["pack"]);
const RUNTIME_IMPORTERS = new Set([
  "src/index.ts",
  "src/channels/cli/with_run_db.ts",
]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function walk(directory) {
  const entries = readdirSync(directory).sort();
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function extractSpecifiers(content) {
  const specifiers = [];
  const pattern =
    /(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of content.matchAll(pattern)) {
    const specifier = match[1] ?? match[2];
    if (specifier) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

function resolveSpecifier(importerPath, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const absolute = path.resolve(path.dirname(importerPath), specifier);
  return toPosix(path.relative(projectRoot, absolute));
}

function classify(relativePath) {
  const parts = relativePath.split("/");
  if (parts[0] !== "src") {
    return null;
  }
  return {
    relativePath,
    layer: parts[1] ?? null,
    subsystem: parts[2] ?? null,
    parts,
  };
}

function isTestFile(relativePath) {
  return relativePath.endsWith(".test.ts") || relativePath.endsWith(".test.tsx");
}

function checkImport(importer, imported) {
  const errors = [];
  if (!importer || !imported) {
    return errors;
  }

  if (importer.layer === "channels" && imported.layer === "tools") {
    errors.push("channels/ must not import tools/ directly");
  }

  if (imported.layer !== "core" || !imported.subsystem) {
    return errors;
  }

  const sameCoreSubsystem =
    importer.layer === "core" && importer.subsystem !== null && importer.subsystem === imported.subsystem;
  const namespace = imported.parts[3] ?? null;
  const apiSection = imported.parts[4] ?? null;

  if (namespace === "internal" && !sameCoreSubsystem) {
    errors.push("cross-subsystem imports into core internal/ are forbidden");
  }

  if (namespace === "runtime" && !sameCoreSubsystem && !RUNTIME_IMPORTERS.has(importer.relativePath)) {
    errors.push("core runtime/ may only be imported by explicit bootstrap/composition paths");
  }

  if (namespace === "api" && apiSection === "write") {
    const allowed = sameCoreSubsystem || importer.layer === "tools";
    if (!allowed) {
      errors.push("core api/write/ may only be imported by tools/");
    }
  }

  if (NAMESPACED_CORE_FEATURES.has(imported.subsystem) && !sameCoreSubsystem) {
    const allowedPath =
      imported.relativePath.startsWith(`src/core/${imported.subsystem}/api/`) ||
      imported.relativePath.startsWith(`src/core/${imported.subsystem}/runtime/`);
    if (!allowedPath) {
      errors.push(
        `cross-subsystem imports into core/${imported.subsystem} must use api/ or runtime/ namespaces`,
      );
    }
  }

  return errors;
}

const files = walk(srcRoot)
  .map((filePath) => toPosix(path.relative(projectRoot, filePath)))
  .filter((relativePath) => (relativePath.endsWith(".ts") || relativePath.endsWith(".tsx")) && !isTestFile(relativePath));

const violations = [];

for (const relativePath of files) {
  const absolutePath = path.join(projectRoot, relativePath);
  const content = readFileSync(absolutePath, "utf8");
  const importer = classify(relativePath);

  for (const specifier of extractSpecifiers(content)) {
    const importedRelativePath = resolveSpecifier(absolutePath, specifier);
    if (!importedRelativePath) {
      continue;
    }
    const imported = classify(importedRelativePath);
    for (const error of checkImport(importer, imported)) {
      violations.push(`${relativePath}: ${error}\n  -> ${specifier}`);
    }
  }
}

if (violations.length > 0) {
  console.error("Boundary check failed:\n");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("boundaries: ok");
