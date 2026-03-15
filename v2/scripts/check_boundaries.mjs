import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

const NAMESPACED_CORE_FEATURES = new Set([
  "chat",
  "config",
  "memory",
  "pack",
  "quests",
  "schedule",
  "secrets",
  "skills",
  "souls",
  "trail",
]);
const RUNTIME_IMPORTERS = new Set([
  "src/index.ts",
  "src/channels/cli/prepare_web.ts",
  "src/channels/cli/with_config_db.ts",
  "src/channels/cli/with_run_db.ts",
  "src/channels/cli/with_secrets_db.ts",
  "src/harness/run_trail_sweep.ts",
  "src/harness/scheduler.ts",
  "src/harness/tools.ts",
]);
const WRITE_IMPORT_ALLOWLIST = new Set([
  "src/harness/tools.ts",
  "src/harness/stoke.ts",
  "src/harness/post_session.ts",
  "src/harness/attune_phase_one.ts",
  "src/harness/run_attune.ts",
  "src/harness/public/settings/config.ts",
  "src/harness/public/settings/schedule.ts",
  "src/harness/public/settings/secrets.ts",
  "src/harness/public/skills.ts",
  "src/harness/public/souls.ts",
  "src/channels/cli/with_run_db.ts",
  "src/channels/cli/handle_run.ts",
  "src/channels/cli/handle_run_stream.ts",
  "src/channels/cli/quests_accept.ts",
  "src/channels/cli/quests_add.ts",
  "src/channels/cli/quests_dismiss.ts",
  "src/channels/cli/quests_done.ts",
  "src/channels/cli/quests_log_add.ts",
  "src/channels/cli/quests_log_done.ts",
  "src/channels/cli/quests_log_update.ts",
  "src/channels/cli/quests_offer.ts",
  "src/channels/cli/quests_update.ts",
  "src/channels/cli/sessions_prune.ts",
  "src/channels/cli/souls_generate_description.ts",
  "src/channels/cli/souls_generate_name.ts",
  "src/channels/cli/to_run_result.ts",
  "src/channels/telegram/handle_reset.ts",
  "src/channels/telegram/notify.ts",
  "src/channels/telegram/rotate_session.ts",
  "src/channels/telegram/telegram.ts",
  "src/channels/tui/tui.ts",
  "src/channels/web/server/routes/chat_api.ts",
  "src/channels/web/server/routes/quests_api.ts",
  "src/channels/web/server/routes/chat_sessions_api.ts",
  "src/channels/web/server/routes/chat_ws.ts",
  "src/channels/web/server/routes/sessions_api.ts",
  "src/channels/web/server/routes/soul_generate.ts",
  "src/harness/auto_resume_delegation.ts",
  "src/harness/check_spend_limit.ts",
  "src/harness/chat_factory.ts",
  "src/harness/delegate.ts",
  "src/harness/distill_pending.ts",
  "src/harness/entity.ts",
  "src/harness/haunt/consolidate.ts",
  "src/harness/haunt/run_haunt.ts",
  "src/harness/haunt/types.ts",
  "src/harness/howl/append_origin_resolution_note.ts",
  "src/harness/howl/dismiss.ts",
  "src/harness/howl/reply.ts",
  "src/harness/invoke_historian.ts",
  "src/harness/invoke_mentor.ts",
  "src/harness/invoke_trainer.ts",
  "src/harness/notify_background_complete.ts",
  "src/harness/oneshots/distill_session.ts",
  "src/harness/oneshots/execute_command.ts",
  "src/harness/oneshots/generate_title.ts",
  "src/harness/oneshots/rewrite_essence.ts",
  "src/harness/oneshots/summarize_for_compaction.ts",
  "src/harness/post_turn.ts",
  "src/harness/types.ts",
  "src/index.ts",
]);
const SQL_OUTSIDE_CORE_ALLOWLIST = new Set([
  "src/channels/web/server/routes/pack_api.ts",
  "src/harness/oneshots/distill_session.ts",
  "src/harness/stoke.ts",
]);
const FORBIDDEN_LEGACY_CORE_PATHS = ["src/core/howl/"];

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

function hasRawSqlCall(content) {
  return /\b(?:db|tx|database|conn)\s*\.\s*(?:prepare|exec)\s*\(/.test(content);
}

function checkImport(importer, imported) {
  const errors = [];
  if (!importer || !imported) {
    return errors;
  }

  const importerIsTest = isTestFile(importer.relativePath);

  if (importer.layer === "channels" && imported.layer === "tools") {
    errors.push("channels/ must not import tools/ directly");
  }

  if (imported.layer !== "core" || !imported.subsystem) {
    return errors;
  }

  const sameCoreSubsystem =
    importer.layer === "core" &&
    importer.subsystem !== null &&
    importer.subsystem === imported.subsystem;
  const namespace = imported.parts[3] ?? null;
  const apiSection = imported.parts[4] ?? null;

  if (namespace === "internal" && !sameCoreSubsystem) {
    errors.push("cross-subsystem imports into core internal/ are forbidden");
  }

  if (
    namespace === "runtime" &&
    !sameCoreSubsystem &&
    !importerIsTest &&
    !RUNTIME_IMPORTERS.has(importer.relativePath)
  ) {
    errors.push("core runtime/ may only be imported by explicit bootstrap/composition paths");
  }

  if (namespace === "api" && apiSection === "write") {
    const allowed =
      sameCoreSubsystem ||
      importer.layer === "tools" ||
      importerIsTest ||
      WRITE_IMPORT_ALLOWLIST.has(importer.relativePath);
    if (!allowed) {
      errors.push("core api/write/ may only be imported by tools/ or approved harness flows");
    }
  }

  if (NAMESPACED_CORE_FEATURES.has(imported.subsystem) && !sameCoreSubsystem) {
    const allowedPath =
      imported.relativePath.startsWith(`src/core/${imported.subsystem}/api/read/`) ||
      imported.relativePath.startsWith(`src/core/${imported.subsystem}/api/write/`) ||
      imported.relativePath === `src/core/${imported.subsystem}/api/types.ts` ||
      imported.relativePath === `src/core/${imported.subsystem}/api/constants.ts` ||
      imported.relativePath.startsWith(`src/core/${imported.subsystem}/runtime/`);
    if (!allowedPath) {
      errors.push(
        `cross-subsystem imports into core/${imported.subsystem} must use api/read/, api/write/, runtime/, or approved api type/constant surfaces`,
      );
    }
  }

  return errors;
}

function checkSqlBoundary(relativePath, content) {
  if (isTestFile(relativePath)) {
    return [];
  }
  if (relativePath.startsWith("src/core/") || relativePath.startsWith("src/lib/")) {
    return [];
  }
  if (!hasRawSqlCall(content)) {
    return [];
  }
  if (SQL_OUTSIDE_CORE_ALLOWLIST.has(relativePath)) {
    return [];
  }
  return ["raw SQL outside core/lib is forbidden unless explicitly allowlisted as technical debt"];
}

const files = walk(srcRoot)
  .map((filePath) => toPosix(path.relative(projectRoot, filePath)))
  .filter((relativePath) => relativePath.endsWith(".ts") || relativePath.endsWith(".tsx"));

const violations = [];

for (const legacyPath of FORBIDDEN_LEGACY_CORE_PATHS) {
  if (files.some((relativePath) => relativePath.startsWith(legacyPath))) {
    violations.push(`${legacyPath}: legacy sibling core namespace must not exist`);
  }
}

for (const relativePath of files) {
  const absolutePath = path.join(projectRoot, relativePath);
  const content = readFileSync(absolutePath, "utf8");
  const importer = classify(relativePath);

  for (const error of checkSqlBoundary(relativePath, content)) {
    violations.push(`${relativePath}: ${error}`);
  }

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
