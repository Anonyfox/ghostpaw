import { read, write, types } from "@ghostpaw/affinity";
import { createAgent } from "../../agent.ts";
import type { RuntimeContext } from "../../runtime.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import { renderSoul } from "../souls/render.ts";
import { bridgeAffinityTools } from "./bridge.ts";
import { buildTendPrompt } from "./tend_prompt.ts";
import type { CandidateContext, ContactSummary } from "./tend_prompt.ts";

type AffinityDb = Parameters<typeof read.listDuplicateCandidates>[0];

const DRIFT_THRESHOLD = 0.5;
const BATCH_LIMIT = 10;
const MAX_ROUNDS = 3;

const TEND_TOOLS = new Set([
  "inspect_affinity_item",
  "merge_contacts",
  "manage_relationship",
  "search_affinity",
]);

export interface TendResult {
  phase: "maintenance" | "resolution";
  duplicates: number;
  driftItems: number;
  rounds: number;
  sessionId?: number;
  succeeded?: boolean;
  dismissedCount?: number;
}

function resolveContext(
  affinityDb: AffinityDb,
  candidates: types.DuplicateCandidateRecord[],
  driftItems: types.RadarRecord[],
): CandidateContext {
  const ids = new Set<number>();
  for (const c of candidates) {
    ids.add(c.leftContactId);
    ids.add(c.rightContactId);
  }
  for (const r of driftItems) {
    ids.add(r.contactId);
  }
  const names = new Map<number, string>();
  const profiles = new Map<number, ContactSummary>();
  for (const id of ids) {
    const profile = read.getContactProfile(affinityDb, id);
    names.set(id, profile?.contact.name ?? `#${id}`);
    if (profile) {
      profiles.set(id, {
        identities: profile.identities.map((i) => `${i.type}:${i.value}`),
        attributes: profile.attributes.map((a) => (a.value ? `${a.name}=${a.value}` : a.name)),
        linkCount: profile.topLinks.length,
      });
    }
  }

  const linksBetween = new Map<string, { kind: string; role: string | null }[]>();
  for (const c of candidates) {
    const links = read.getLinksBetween(affinityDb, c.leftContactId, c.rightContactId);
    if (links.length > 0) {
      const key = `${c.leftContactId}:${c.rightContactId}`;
      linksBetween.set(
        key,
        links.map((l) => ({ kind: l.kind, role: l.role ?? null })),
      );
    }
  }

  return { names, profiles, linksBetween };
}

export async function runTend(ctx: RuntimeContext, signal: AbortSignal): Promise<TendResult> {
  const affinityDb = ctx.affinityDb as unknown as AffinityDb;

  let totalDuplicates = 0;
  let totalDrift = 0;
  let totalDismissed = 0;
  let rounds = 0;
  let lastSessionId: number | undefined;
  let lastSucceeded: boolean | undefined;
  let anyFailed = false;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const candidates = read.listDuplicateCandidates(affinityDb, undefined, { limit: BATCH_LIMIT });
    const allRadar = read.listRadar(affinityDb, undefined, { limit: BATCH_LIMIT });
    const driftItems = allRadar.filter((r) => r.driftPriority > DRIFT_THRESHOLD);

    if (candidates.length === 0 && driftItems.length === 0) break;
    if (signal.aborted) break;

    totalDuplicates += candidates.length;
    totalDrift += driftItems.length;
    rounds++;

    const context = resolveContext(affinityDb, candidates, driftItems);
    const tools = bridgeAffinityTools(ctx.affinityDb).filter((t) => TEND_TOOLS.has(t.name));
    const agent = createAgent({ db: ctx.db, tools });
    const systemPrompt = renderSoul(ctx.soulsDb, ctx.soulIds.innkeeper);
    const session = createSession(ctx.db, ctx.config.model_small, systemPrompt, {
      purpose: "pulse",
      soulId: ctx.soulIds.innkeeper,
      title: `tend:${candidates.length}d+${driftItems.length}r`,
    });
    lastSessionId = session.id;

    const prompt = buildTendPrompt(candidates, driftItems, context);
    let succeeded = false;
    try {
      const result = await agent.executeTurn(session.id, prompt, {
        model: ctx.config.model_small,
      });
      succeeded = result.succeeded;
    } finally {
      sealSessionTail(ctx.db, session.id);
    }

    lastSucceeded = succeeded;
    if (!succeeded) {
      anyFailed = true;
      break;
    }

    for (const c of candidates) {
      const leftProfile = read.getContactProfile(affinityDb, c.leftContactId);
      const rightProfile = read.getContactProfile(affinityDb, c.rightContactId);
      const leftMerged = !leftProfile || leftProfile.contact.lifecycleState === "merged";
      const rightMerged = !rightProfile || rightProfile.contact.lifecycleState === "merged";
      if (leftMerged || rightMerged) continue;

      try {
        write.dismissDuplicate(affinityDb, c.leftContactId, c.rightContactId, "tend: reviewed");
        totalDismissed++;
      } catch {
        // AffinityStateError or AffinityNotFoundError — race with concurrent mutation
      }
    }
  }

  if (rounds === 0) {
    return { phase: "maintenance", duplicates: 0, driftItems: 0, rounds: 0 };
  }

  return {
    phase: "resolution",
    duplicates: totalDuplicates,
    driftItems: totalDrift,
    rounds,
    sessionId: lastSessionId,
    succeeded: !anyFailed && lastSucceeded,
    dismissedCount: anyFailed ? undefined : totalDismissed,
  };
}
