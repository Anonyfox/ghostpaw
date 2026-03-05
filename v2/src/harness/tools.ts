import type { Tool } from "chatoyant";
import type { ChatFactory } from "../core/chat/index.ts";
import { getSecret } from "../core/secrets/index.ts";
import { listSouls, MANDATORY_SOUL_IDS } from "../core/souls/index.ts";
import type { DatabaseHandle } from "../lib/index.ts";
import { createBashTool } from "../tools/bash.ts";
import { createCalcTool } from "../tools/calc.ts";
import { createCheckRunTool } from "../tools/check_run.ts";
import {
  createGetConfigTool,
  createListConfigTool,
  createResetConfigTool,
  createSetConfigTool,
  createUndoConfigTool,
} from "../tools/config/index.ts";
import { createDatetimeTool } from "../tools/datetime.ts";
import { createDelegateTool } from "../tools/delegate.ts";
import { createEditTool } from "../tools/edit.ts";
import { createGrepTool } from "../tools/grep.ts";
import { createLsTool } from "../tools/ls.ts";
import { createMcpTool } from "../tools/mcp/index.ts";
import {
  createForgetTool,
  createRecallTool,
  createRememberTool,
  createReviseTool,
} from "../tools/memory/index.ts";
import { createMentorTools } from "../tools/mentor/index.ts";
import { createReadTool } from "../tools/read.ts";
import {
  createListSecretsTool,
  createRemoveSecretTool,
  createSetSecretTool,
} from "../tools/secrets/index.ts";
import { createSenseTool } from "../tools/sense.ts";
import { createTrainerTools } from "../tools/trainer/index.ts";
import { createWebFetchTool } from "../tools/web_fetch.ts";
import { createWebSearchTool } from "../tools/web_search/index.ts";
import { createWriteTool } from "../tools/write.ts";
import { createDelegateHandler } from "./delegate.ts";

import type { DelegationRun } from "../core/runs/index.ts";

export interface EntityToolsConfig {
  db: DatabaseHandle;
  workspace: string;
  chatFactory: ChatFactory;
  getParentSessionId: () => number | null;
  onBackgroundComplete?: (parentSessionId: number, run: DelegationRun) => void;
}

export interface EntityToolSets {
  baseTools: Tool[];
  mentorTools: Tool[];
  trainerTools: Tool[];
  allToolsWithMentor: Tool[];
  allToolsWithTrainer: Tool[];
  shutdown(): Promise<void>;
}

export function createEntityToolSets(config: EntityToolsConfig): EntityToolSets {
  const { db, workspace, chatFactory, getParentSessionId } = config;

  const mcp = createMcpTool({
    resolveSecret: (name) => getSecret(db, name) ?? process.env[name] ?? null,
  });

  const coreTools: Tool[] = [
    createReadTool(workspace),
    createWriteTool(workspace),
    createEditTool(workspace),
    createLsTool(workspace),
    createGrepTool(workspace),
    createBashTool(workspace),
    createWebFetchTool(workspace),
    createWebSearchTool(),
    mcp.tool,
    createRecallTool(db),
    createRememberTool(db),
    createReviseTool(db),
    createForgetTool(db),
    createGetConfigTool(db),
    createListConfigTool(db),
    createSetConfigTool(db),
    createUndoConfigTool(db),
    createResetConfigTool(db),
    createListSecretsTool(db),
    createSetSecretTool(db),
    createRemoveSecretTool(db),
    createCalcTool(),
    createDatetimeTool(),
    createSenseTool(),
  ];

  const mentorOnly = createMentorTools(db);
  const trainerOnly = createTrainerTools(workspace);

  const specialists = listSouls(db)
    .filter((s) => s.id !== MANDATORY_SOUL_IDS.ghostpaw)
    .map((s) => s.name);

  const allWithMentor = [...coreTools, ...mentorOnly];
  const allWithTrainer = [...coreTools, ...trainerOnly];

  const delegateHandler = createDelegateHandler({
    db,
    workspace,
    tools: coreTools,
    mentorTools: mentorOnly,
    trainerTools: trainerOnly,
    chatFactory,
    getParentSessionId,
    onBackgroundComplete: config.onBackgroundComplete,
  });

  const delegateTool = createDelegateTool(delegateHandler, specialists);
  const checkRunTool = createCheckRunTool(db);

  const baseTools = [...coreTools, delegateTool, checkRunTool];
  const allToolsWithMentor = [...allWithMentor, delegateTool, checkRunTool];
  const allToolsWithTrainer = [...allWithTrainer, delegateTool, checkRunTool];

  return {
    baseTools,
    mentorTools: mentorOnly,
    trainerTools: trainerOnly,
    allToolsWithMentor,
    allToolsWithTrainer,
    shutdown: () => mcp.shutdown(),
  };
}
