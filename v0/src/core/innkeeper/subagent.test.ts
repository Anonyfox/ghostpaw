import assert from "node:assert";
import { describe, it } from "node:test";
import { write } from "@ghostpaw/affinity";
import { openMemoryAffinityDatabase } from "../db/open_affinity.ts";
import { openMemoryDatabase } from "../db/open.ts";
import { openMemorySoulsDatabase } from "../db/open_souls.ts";
import { bootstrapSouls } from "../souls/bootstrap.ts";
import { renderSoul } from "../souls/render.ts";
import { buildExistingRoster } from "./subagent.ts";

describe("innkeeper subagent module", () => {
  it("can import runAffinitySubagent", async () => {
    const { runAffinitySubagent } = await import("./subagent.ts");
    assert.strictEqual(typeof runAffinitySubagent, "function");
  });

  it("runAffinitySubagent accepts soulsDb and innkeeperId as parameters", async () => {
    const { runAffinitySubagent } = await import("./subagent.ts");
    assert.strictEqual(runAffinitySubagent.length, 3, "should take opts, soulsDb, innkeeperId");
  });

  it("renders a non-empty soul prompt for innkeeper ID", () => {
    const soulsDb = openMemorySoulsDatabase();
    const ids = bootstrapSouls(soulsDb);
    const rendered = renderSoul(soulsDb, ids.innkeeper);
    assert.ok(rendered.length > 100, "innkeeper soul should render to substantial text");
    assert.ok(rendered.includes("Innkeeper"), "rendered soul should mention Innkeeper");
    soulsDb.close();
  });

  it("child session is created with subsystem_turn purpose", async () => {
    const chatDb = openMemoryDatabase();
    const { createSession } = await import("../chat/session.ts");

    const session = createSession(chatDb, "m", "p", {
      purpose: "subsystem_turn",
      parentSessionId: 1,
      triggeredByMessageId: 42,
    });

    assert.strictEqual(session.purpose, "subsystem_turn");
    assert.strictEqual(session.parent_session_id, 1);
    assert.strictEqual(session.triggered_by_message_id, 42);

    chatDb.close();
  });
});

describe("buildExistingRoster", () => {
  it("returns empty string when no contacts exist", async () => {
    const db = await openMemoryAffinityDatabase();
    assert.strictEqual(buildExistingRoster(db), "");
    db.close();
  });

  it("lists active contacts with names and kinds", async () => {
    const db = await openMemoryAffinityDatabase();
    // biome-ignore lint/suspicious/noExplicitAny: test shim
    const aDb = db as any;
    write.createContact(aDb, { name: "Alice", kind: "human" });
    write.createContact(aDb, { name: "Acme Corp", kind: "company" });

    const roster = buildExistingRoster(db);
    assert.ok(roster.includes("EXISTING CONTACTS"));
    assert.ok(roster.includes("Alice (human)"));
    assert.ok(roster.includes("Acme Corp (company)"));
    db.close();
  });

  it("includes identities inline", async () => {
    const db = await openMemoryAffinityDatabase();
    // biome-ignore lint/suspicious/noExplicitAny: test shim
    const aDb = db as any;
    const receipt = write.createContact(aDb, { name: "Bob", kind: "human" });
    write.addIdentity(aDb, receipt.primary.id, { type: "email", value: "bob@test.com" });

    const roster = buildExistingRoster(db);
    assert.ok(roster.includes("email: bob@test.com"));
    db.close();
  });

  it("marks owner contacts", async () => {
    const db = await openMemoryAffinityDatabase();
    // biome-ignore lint/suspicious/noExplicitAny: test shim
    const aDb = db as any;
    write.createContact(aDb, { name: "Owner", kind: "human", bootstrapOwner: true });

    const roster = buildExistingRoster(db);
    assert.ok(roster.includes("owner"));
    db.close();
  });

  it("includes attributes inline alongside identities", async () => {
    const db = await openMemoryAffinityDatabase();
    // biome-ignore lint/suspicious/noExplicitAny: test shim
    const aDb = db as any;
    const receipt = write.createContact(aDb, { name: "Carol", kind: "human" });
    write.addIdentity(aDb, receipt.primary.id, { type: "email", value: "carol@co.com" });
    write.setAttribute(aDb, { kind: "contact", id: receipt.primary.id }, "profession", "dentist");

    const roster = buildExistingRoster(db);
    assert.ok(roster.includes("email: carol@co.com"), "should show identity");
    assert.ok(roster.includes("profession=dentist"), "should show attribute");
    db.close();
  });
});
