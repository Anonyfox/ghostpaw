import { resolve } from "node:path";
import {
  fragmentCountsBySource,
  getSkill,
  listFragments,
  listSkills,
  pendingProposals,
  readSkillHealth,
  skillPendingChanges,
  skillRank,
  skillReadiness,
  skillTier,
  validateSkill,
} from "../../../../core/skills/index.ts";
import { approveProposal, dismissProposal } from "../../../../core/skills/skill_health.ts";
import type { Entity } from "../../../../harness/index.ts";
import {
  buildCreateExecutePrompt,
  buildCreateProposePrompt,
  invokeTrainerExecute,
  invokeTrainerPropose,
} from "../../../../harness/index.ts";
import type { DatabaseHandle } from "../../../../lib/index.ts";
import type { RouteContext } from "../types.ts";

function json(ctx: RouteContext, status: number, data: unknown): void {
  ctx.res.writeHead(status, { "Content-Type": "application/json" });
  ctx.res.end(JSON.stringify(data));
}

export function createSkillsApiHandlers(db: DatabaseHandle, entity?: Entity) {
  const workspace = resolve(process.env.GHOSTPAW_WORKSPACE ?? ".");

  return {
    list(ctx: RouteContext): void {
      try {
        const skills = listSkills(workspace, db);
        json(ctx, 200, skills);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    detail(ctx: RouteContext): void {
      const name = ctx.params.name;
      if (!name) {
        json(ctx, 400, { error: "Missing skill name." });
        return;
      }

      try {
        const skill = getSkill(workspace, name);
        if (!skill) {
          json(ctx, 404, { error: `Skill "${name}" not found.` });
          return;
        }

        const rank = skillRank(workspace, name);
        const { tier } = skillTier(rank);
        const readiness = skillReadiness(db, name);
        const pending = skillPendingChanges(workspace, name);
        const validation = validateSkill(workspace, name);

        json(ctx, 200, {
          name: skill.name,
          description: skill.description,
          body: skill.body,
          rank,
          tier,
          readiness: readiness.color,
          hasPendingChanges: pending.totalChanges > 0,
          files: skill.files,
          validation: {
            valid: validation.valid,
            issues: validation.issues.map((i) => ({
              severity: i.severity,
              code: i.code,
              message: i.message,
            })),
          },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    validate(ctx: RouteContext): void {
      const name = ctx.params.name;
      if (!name) {
        json(ctx, 400, { error: "Missing skill name." });
        return;
      }

      try {
        const result = validateSkill(workspace, name);
        json(ctx, 200, result);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    health(ctx: RouteContext): void {
      try {
        const health = readSkillHealth(db);
        json(ctx, 200, health ?? { error: "No health data yet. Run stoke first." });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    proposals(ctx: RouteContext): void {
      try {
        const proposals = pendingProposals(db);
        json(ctx, 200, proposals);
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    fragments(ctx: RouteContext): void {
      try {
        const fragments = listFragments(db);
        const sources = fragmentCountsBySource(db);
        const sourceSummaries = Object.entries(sources).map(([source, counts]) => ({
          source,
          pending: counts.pending,
          absorbed: counts.absorbed,
        }));
        json(ctx, 200, { fragments, sources: sourceSummaries });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    async approve(ctx: RouteContext): Promise<void> {
      const id = Number(ctx.params.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid proposal ID." });
        return;
      }

      if (!entity) {
        json(ctx, 503, { error: "Entity not available." });
        return;
      }

      try {
        const proposals = pendingProposals(db);
        const proposal = proposals.find((p) => p.id === id);
        if (!proposal) {
          json(ctx, 404, { error: `Proposal ${id} not found or already resolved.` });
          return;
        }

        approveProposal(db, id);

        const proposePrompt = buildCreateProposePrompt(proposal.title);
        const proposeResult = await invokeTrainerPropose(entity, db, proposePrompt, {
          purpose: "create",
        });

        const executePrompt = buildCreateExecutePrompt(
          proposal.title,
          proposal.rationale,
          `Create this skill based on proposal: ${proposal.rationale}`,
        );
        const result = await invokeTrainerExecute(
          entity,
          db,
          proposeResult.sessionId,
          executePrompt,
        );

        json(ctx, 200, {
          approved: true,
          proposalId: id,
          content: result.content,
          succeeded: result.succeeded,
          cost: { totalUsd: proposeResult.cost.estimatedUsd + result.cost.estimatedUsd },
        });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },

    dismiss(ctx: RouteContext): void {
      const id = Number(ctx.params.id);
      if (!id || Number.isNaN(id)) {
        json(ctx, 400, { error: "Invalid proposal ID." });
        return;
      }

      try {
        dismissProposal(db, id);
        json(ctx, 200, { dismissed: true, proposalId: id });
      } catch (err) {
        json(ctx, 500, { error: err instanceof Error ? err.message : String(err) });
      }
    },
  };
}
