import { resolve } from "node:path";
import { defineCommand } from "citty";
import { validateAllSkills } from "../../core/skills/api/read/index.ts";
import { style } from "../../lib/terminal/index.ts";

export default defineCommand({
  meta: { name: "validate", description: "Validate all skills and report issues" },
  async run() {
    const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");
    const results = validateAllSkills(workspace);

    if (results.length === 0) {
      console.log(style.dim("No skills found to validate."));
      return;
    }

    let totalIssues = 0;
    for (const r of results) {
      if (r.valid) {
        console.log(`${style.green("✓")} ${r.name}`);
      } else {
        console.log(`${style.yellow("!")} ${r.name}`);
        for (const issue of r.issues) {
          totalIssues++;
          const sev =
            issue.severity === "error"
              ? style.red(issue.severity)
              : issue.severity === "warning"
                ? style.yellow(issue.severity)
                : style.dim(issue.severity);
          const fix = issue.autoFixable ? style.dim(" (auto-fixable)") : "";
          console.log(`    ${sev}: ${issue.message}${fix}`);
        }
      }
    }

    console.log();
    console.log(
      style.dim(
        `${results.length} skills checked, ${totalIssues} issue${totalIssues === 1 ? "" : "s"} found.`,
      ),
    );
  },
});
