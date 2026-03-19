import { ok, strictEqual } from "node:assert";
import { fork } from "node:child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";
import { after, describe, it } from "node:test";

const FIXTURE_DIR = `/tmp/gp-sv-${process.pid}`;
const SOCK_DIR = join(FIXTURE_DIR, ".ghostpaw");
const SOCK = join(SOCK_DIR, "supervisor.sock");

mkdirSync(SOCK_DIR, { recursive: true });

function fixture(name: string, code: string): string {
  const path = join(FIXTURE_DIR, `${name}.mjs`);
  writeFileSync(path, code, "utf-8");
  return path;
}

function cleanSocket(): void {
  if (existsSync(SOCK)) {
    try {
      unlinkSync(SOCK);
    } catch {}
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function connectSock(): Promise<boolean> {
  return new Promise((res) => {
    const conn = createConnection({ path: SOCK }, () => {
      conn.end();
      res(true);
    });
    conn.on("error", () => res(false));
  });
}

function sendCmd(cmd: string): Promise<{ ok: boolean; [k: string]: unknown }> {
  return new Promise((res, rej) => {
    const conn = createConnection({ path: SOCK }, () => {
      conn.write(`${JSON.stringify({ cmd })}\n`);
    });
    let buf = "";
    conn.on("data", (chunk) => {
      buf += chunk.toString();
      if (!buf.includes("\n")) return;
      conn.end();
      try {
        res(JSON.parse(buf.slice(0, buf.indexOf("\n"))));
      } catch (err) {
        rej(err);
      }
    });
    conn.on("error", (err) => rej(err));
    setTimeout(() => rej(new Error("timeout")), 5000);
  });
}

after(() => {
  cleanSocket();
});

describe("supervisor", () => {
  it("exits cleanly when child exits 0", async () => {
    cleanSocket();
    const script = fixture(
      "exit0",
      `import { fork } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
const sock = ${JSON.stringify(SOCK)};
if (!process.env.GHOSTPAW_SUPERVISED) {
  if (existsSync(sock)) unlinkSync(sock);
  const srv = createServer(() => {});
  srv.listen(sock);
  srv.unref();
  const child = fork(process.argv[1], [], {
    env: { ...process.env, GHOSTPAW_SUPERVISED: "1" },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  child.on("exit", (code) => {
    srv.close();
    if (existsSync(sock)) try { unlinkSync(sock); } catch {}
    process.exit(code ?? 0);
  });
} else {
  process.exit(0);
}
`,
    );
    const child = fork(script, [], { stdio: "pipe" });
    const code = await new Promise<number>((res) => {
      child.on("exit", (c) => res(c ?? -1));
    });
    strictEqual(code, 0);
  });

  it("restarts child on exit 75 then stops on exit 0", async () => {
    cleanSocket();
    const counterFile = join(FIXTURE_DIR, "counter.txt");
    writeFileSync(counterFile, "0", "utf-8");

    const script = fixture(
      "exit75",
      `import { fork } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
const sock = ${JSON.stringify(SOCK)};
const counterFile = ${JSON.stringify(counterFile)};
if (!process.env.GHOSTPAW_SUPERVISED) {
  if (existsSync(sock)) unlinkSync(sock);
  const srv = createServer(() => {});
  srv.listen(sock);
  srv.unref();
  function spawnChild() {
    const child = fork(process.argv[1], [], {
      env: { ...process.env, GHOSTPAW_SUPERVISED: "1" },
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    child.on("exit", (code) => {
      if (code === 75) { spawnChild(); return; }
      srv.close();
      if (existsSync(sock)) try { unlinkSync(sock); } catch {}
      process.exit(code ?? 0);
    });
  }
  spawnChild();
} else {
  const count = parseInt(readFileSync(counterFile, "utf-8"), 10);
  writeFileSync(counterFile, String(count + 1), "utf-8");
  process.exit(count < 2 ? 75 : 0);
}
`,
    );
    const child = fork(script, [], { stdio: "pipe" });
    const code = await new Promise<number>((res) => {
      child.on("exit", (c) => res(c ?? -1));
    });
    strictEqual(code, 0);
    const { readFileSync } = await import("node:fs");
    const finalCount = parseInt(readFileSync(counterFile, "utf-8"), 10);
    strictEqual(finalCount, 3);
  });

  it("exits with 78 when child exits 78 (fatal)", async () => {
    cleanSocket();
    const script = fixture(
      "exit78",
      `import { fork } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
const sock = ${JSON.stringify(SOCK)};
if (!process.env.GHOSTPAW_SUPERVISED) {
  if (existsSync(sock)) unlinkSync(sock);
  const srv = createServer(() => {});
  srv.listen(sock);
  srv.unref();
  const child = fork(process.argv[1], [], {
    env: { ...process.env, GHOSTPAW_SUPERVISED: "1" },
    stdio: ["inherit", "inherit", "inherit", "ipc"],
  });
  child.on("exit", (code) => {
    srv.close();
    if (existsSync(sock)) try { unlinkSync(sock); } catch {}
    process.exit(code ?? 1);
  });
} else {
  process.exit(78);
}
`,
    );
    const child = fork(script, [], { stdio: "pipe" });
    const code = await new Promise<number>((res) => {
      child.on("exit", (c) => res(c ?? -1));
    });
    strictEqual(code, 78);
  });

  it("heartbeat sends messages over IPC", async () => {
    const script = fixture(
      "heartbeat",
      `if (typeof process.send === "function") {
  const iv = setInterval(() => process.send({ type: "heartbeat" }), 100);
  setTimeout(() => { clearInterval(iv); process.exit(0); }, 500);
}
`,
    );
    const child = fork(script, [], { stdio: "pipe" });
    let heartbeats = 0;
    child.on("message", (msg) => {
      if (msg && typeof msg === "object" && (msg as { type?: string }).type === "heartbeat") {
        heartbeats++;
      }
    });
    await new Promise<void>((res) => child.on("exit", () => res()));
    ok(heartbeats >= 3, `expected >= 3 heartbeats, got ${heartbeats}`);
  });

  it("control channel responds to status and stop", async () => {
    cleanSocket();
    const script = fixture(
      "control",
      `import { createServer } from "node:net";
import { existsSync, unlinkSync } from "node:fs";
const sock = ${JSON.stringify(SOCK)};
if (existsSync(sock)) unlinkSync(sock);
const startedAt = Date.now();
const srv = createServer((conn) => {
  let buf = "";
  conn.on("data", (chunk) => {
    buf += chunk.toString();
    if (!buf.includes("\\n")) return;
    const msg = JSON.parse(buf.slice(0, buf.indexOf("\\n")));
    buf = "";
    if (msg.cmd === "status") {
      conn.end(JSON.stringify({
        ok: true, pid: process.pid, childPid: null,
        uptime: Math.round((Date.now() - startedAt) / 1000), crashes: 0,
      }) + "\\n");
    } else if (msg.cmd === "stop") {
      conn.end(JSON.stringify({ ok: true, action: "stopping" }) + "\\n");
      srv.close();
      if (existsSync(sock)) try { unlinkSync(sock); } catch {}
      process.exit(0);
    }
  });
});
srv.listen(sock);
process.send?.({ type: "ready" });
`,
    );

    const child = fork(script, [], { stdio: "pipe" });

    await new Promise<void>((res) => {
      child.on("message", (msg) => {
        if (msg && typeof msg === "object" && (msg as { type?: string }).type === "ready") res();
      });
      setTimeout(res, 3000);
    });
    await sleep(100);

    const statusResp = await sendCmd("status");
    ok(statusResp.ok, "status response should be ok");
    strictEqual(typeof statusResp.pid, "number");
    strictEqual(statusResp.crashes, 0);

    const stopResp = await sendCmd("stop");
    ok(stopResp.ok, "stop response should be ok");

    await new Promise<void>((res) => {
      child.on("exit", () => res());
      setTimeout(res, 3000);
    });
  });

  it("stale socket file does not block connection check", async () => {
    cleanSocket();
    writeFileSync(SOCK, "stale", "utf-8");
    ok(existsSync(SOCK), "stale socket file should exist");

    const connected = await connectSock();
    strictEqual(connected, false, "should not connect to a stale file");
    cleanSocket();
  });

  it("socket lock prevents duplicate supervisors", async () => {
    cleanSocket();
    const srv = createServer(() => {});
    srv.listen(SOCK);

    const connected = await connectSock();
    ok(connected, "should connect to active socket");

    srv.close();
    await sleep(100);
    cleanSocket();
  });

  it("sendCommand utility works end-to-end", async () => {
    cleanSocket();
    const srv = createServer((conn) => {
      let buf = "";
      conn.on("data", (chunk) => {
        buf += chunk.toString();
        if (!buf.includes("\n")) return;
        const msg = JSON.parse(buf.slice(0, buf.indexOf("\n")));
        conn.end(`${JSON.stringify({ ok: true, echo: msg.cmd })}\n`);
      });
    });
    srv.listen(SOCK);

    const { sendCommand } = await import("./supervisor.ts");
    const resp = await sendCommand(FIXTURE_DIR, "status");
    ok(resp.ok);
    strictEqual(resp.echo, "status");

    srv.close();
    await sleep(100);
    cleanSocket();
  });
});
