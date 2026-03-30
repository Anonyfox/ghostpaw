import { read, types } from "@ghostpaw/affinity";
import type { Tool } from "chatoyant";
import { Chat, Message } from "chatoyant";
import type { DatabaseHandle } from "../../lib/database_handle.ts";
import { persistTurnMessages } from "../chat/persist_turn.ts";
import { sealSessionTail } from "../chat/seal_session_tail.ts";
import { createSession } from "../chat/session.ts";
import type { SubsystemResult, SubsystemRunOpts } from "../interceptor/registry.ts";
import { renderSoul } from "../souls/render.ts";
import { bridgeAffinityTools } from "./bridge.ts";
import { createAffinitySkillsTool } from "./skills.ts";

type AffinityDb = Parameters<typeof read.listContacts>[0];

const ROSTER_LIMIT = 50;

const OBSERVATION_PREAMBLE = `TASK — The messages above are conversation context \
between a user and the main assistant. You are the Innkeeper subsystem — an observer, \
not a participant.`;

const OBSERVATION_BODY = `Scan for people, organizations, teams, relationships, events, and social signals. \
For anything you find:
1. Match against the EXISTING CONTACTS list below. Only call manage_contact with \
action "create" for people NOT already listed. If a name matches but you are unsure \
which ID, call search_affinity to disambiguate.
2. manage_relationship to seed links between contacts.
3. record_event for notable interactions, observations, or milestones.
4. manage_attribute to store descriptive facts about a contact — profession, title, \
department, company role, city, or any trait that distinguishes this person from others \
with a similar name. Use short key-value pairs (e.g. name="profession" value="dentist").
5. manage_identity — when the user provides an email, phone number, handle, alias, or URL \
for a known contact. If it can locate a person, it is an identity, not an attribute.
6. merge_contacts — ONLY when the user explicitly states two people are the same person \
(e.g. "X is Y", "X is the same as Y"). Never merge based on name similarity alone.

CRITICAL: Stating "Created" or "Recorded" in your text response does NOT save anything \
to the database. Only tool calls persist data. If you found 5 new people, you need 5 \
separate manage_contact calls.

Do NOT answer the user's question. Do NOT help with their task. Do NOT write code or \
explanations outside your domain. ONLY maintain the social graph, then write your \
[innkeeper] summary of what you actually persisted via tool calls.

If nothing in the conversation involves people or relationships, respond exactly: \
[innkeeper] Nothing noteworthy this turn.`;

export function buildExistingRoster(db: DatabaseHandle): string {
  const affinityDb = db as unknown as AffinityDb;
  const contacts = read.listContacts(affinityDb, { lifecycleState: "active" }, { limit: ROSTER_LIMIT });
  if (contacts.length === 0) return "";

  const lines: string[] = ["EXISTING CONTACTS (do NOT create duplicates):"];
  for (const c of contacts) {
    const profile = read.getContactProfile(affinityDb, c.id);
    let line = `#${c.id} ${c.name} (${c.kind}`;
    if (c.isOwner) line += ", owner";
    line += ")";

    const parts: string[] = [];
    if (profile) {
      for (const ident of profile.identities) {
        parts.push(`${ident.type}: ${ident.value}`);
      }
      for (const attr of profile.attributes) {
        parts.push(attr.value ? `${attr.name}=${attr.value}` : attr.name);
      }
    }
    if (parts.length > 0) line += ` [${parts.join(", ")}]`;
    lines.push(line);
  }
  return lines.join("\n");
}

function buildObservationDirective(db: DatabaseHandle): string {
  const roster = buildExistingRoster(db);
  const sections = [OBSERVATION_PREAMBLE];
  if (roster) sections.push("", roster);
  sections.push("", OBSERVATION_BODY);
  return sections.join("\n");
}

export async function runAffinitySubagent(
  opts: SubsystemRunOpts,
  soulsDb: DatabaseHandle,
  innkeeperId: number,
): Promise<SubsystemResult> {
  const {
    db,
    chatDb,
    parentSessionId,
    triggerMessageId,
    context,
    model,
    maxIterations,
    timeoutMs,
  } = opts;

  const affinityTools: Tool[] = [...bridgeAffinityTools(db), createAffinitySkillsTool()];
  const systemPrompt = renderSoul(soulsDb, innkeeperId);
  const directive = buildObservationDirective(db);

  const session = createSession(chatDb, model, systemPrompt, {
    purpose: "subsystem_turn",
    parentSessionId,
    triggeredByMessageId: triggerMessageId,
    soulId: innkeeperId,
  });

  const chat = new Chat({ model });
  chat.system(systemPrompt);
  chat.addMessages(context);
  chat.addMessage(new Message("user", directive));
  chat.addTools(affinityTools);

  const preCount = chat.messages.length;

  let timer: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      chat.generate({ maxIterations }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("subsystem timeout")), timeoutMs);
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { sessionId: session.id, summary: `[innkeeper] Error: ${msg}`, succeeded: false };
  } finally {
    clearTimeout(timer!);
  }

  const newMessages = chat.messages.slice(preCount);
  const lastResult = chat.lastResult;

  persistTurnMessages(chatDb, session.id, newMessages, {
    model: lastResult?.model ?? model,
    inputTokens: lastResult?.usage.inputTokens,
    outputTokens: lastResult?.usage.outputTokens,
    cachedTokens: lastResult?.usage.cachedTokens,
    reasoningTokens: lastResult?.usage.reasoningTokens,
    costUsd: lastResult?.cost.estimatedUsd,
  });

  const finalContent =
    newMessages.length > 0 ? (newMessages[newMessages.length - 1].content ?? "") : "";

  sealSessionTail(chatDb, session.id);

  const fallback = "[innkeeper] Nothing noteworthy this turn.";

  if (!finalContent) {
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  if (!finalContent.includes("[innkeeper]")) {
    console.error(
      "[interceptor] innkeeper response violated protocol — discarding off-protocol output",
    );
    return { sessionId: session.id, summary: fallback, succeeded: true };
  }

  return { sessionId: session.id, summary: finalContent, succeeded: true };
}
