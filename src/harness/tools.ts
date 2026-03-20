import type { Tool } from "chatoyant";
import { getSession } from "../core/chat/api/read/index.ts";
import type { ChatFactory } from "../core/chat/api/write/index.ts";
import { getSecretValue } from "../core/secrets/runtime/index.ts";
import { projectSkillReadContent } from "../core/skills/api/read/index.ts";
import { logSkillEvent } from "../core/skills/api/write/index.ts";
import { listSouls, MANDATORY_SOUL_IDS } from "../core/souls/api/read/index.ts";
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
import { createCostCheckTool, createCostSummaryTool } from "../tools/cost/index.ts";
import { createDatetimeTool } from "../tools/datetime.ts";
import { createSpecialistDelegateTool } from "../tools/delegate.ts";
import { createEditTool } from "../tools/edit.ts";
import { createGrepTool } from "../tools/grep.ts";
import {
  createHistorianNightlyTools,
  createHistorianOndemandTools,
} from "../tools/historian/index.ts";
import { createHowlTool } from "../tools/howl.ts";
import { createLsTool } from "../tools/ls.ts";
import { createMcpTool } from "../tools/mcp/index.ts";
import {
  createForgetTool,
  createRecallTool,
  createRememberTool,
  createReviseTool,
} from "../tools/memory/index.ts";
import { createMentorTools } from "../tools/mentor/index.ts";
import { createPackTools } from "../tools/pack/index.ts";
import { createQuestTools } from "../tools/quests/index.ts";
import { createReadTool } from "../tools/read.ts";
import { createRecallHauntsTool } from "../tools/recall_haunts.ts";
import { createScheduleTools } from "../tools/schedule/index.ts";
import {
  createListSecretsTool,
  createRemoveSecretTool,
  createSetSecretTool,
} from "../tools/secrets/index.ts";
import { createSenseTool } from "../tools/sense.ts";
import { createStokeTools, createTrainerTools } from "../tools/trainer/index.ts";
import { createWebFetchTool } from "../tools/web_fetch.ts";
import { createWebSearchTool } from "../tools/web_search/index.ts";
import { createWriteTool } from "../tools/write.ts";
import { createDelegateHandler } from "./delegate.ts";
import type { DelegationOutcome } from "./types.ts";

export interface EntityToolsConfig {
  db: DatabaseHandle;
  workspace: string;
  chatFactory: ChatFactory;
  getParentSessionId: () => number | null;
  onBackgroundComplete?: (parentSessionId: number, outcome: DelegationOutcome) => void;
}

export interface EntityToolSets {
  baseTools: Tool[];
  wardenTools: Tool[];
  chamberlainTools: Tool[];
  mentorTools: Tool[];
  trainerTools: Tool[];
  historianNightlyTools: Tool[];
  historianOndemandTools: Tool[];
  stokeTools: Tool[];
  allToolsWithMentor: Tool[];
  allToolsWithTrainer: Tool[];
  allToolsWithHistorian: Tool[];
  shutdown(): Promise<void>;
}

export function createWardenTools(db: DatabaseHandle): Tool[] {
  return [
    createRecallTool(db),
    createRememberTool(db),
    createReviseTool(db),
    createForgetTool(db),
    ...createPackTools(db),
    ...createQuestTools(db),
    createDatetimeTool(),
    createRecallHauntsTool(db),
  ];
}

export function createChamberlainTools(db: DatabaseHandle): Tool[] {
  return [
    createGetConfigTool(db),
    createListConfigTool(db),
    createSetConfigTool(db),
    createUndoConfigTool(db),
    createResetConfigTool(db),
    createListSecretsTool(db),
    createSetSecretTool(db),
    createRemoveSecretTool(db),
    ...createScheduleTools(db),
    createCalcTool(),
    createDatetimeTool(),
    createCostSummaryTool(db),
    createCostCheckTool(db),
  ];
}

export function createEntityToolSets(config: EntityToolsConfig): EntityToolSets {
  const { db, workspace, chatFactory, getParentSessionId } = config;

  const mcp = createMcpTool({
    resolveSecret: (name) => getSecretValue(db, name) ?? process.env[name] ?? null,
  });

  const SKILL_PATH_RE = /^skills\/([^/]+)\/SKILL\.md$/;

  const sharedTools: Tool[] = [
    createReadTool(workspace, {
      onRead: (filePath) => {
        const match = filePath.match(SKILL_PATH_RE);
        if (match) {
          try {
            logSkillEvent(db, match[1], "read");
          } catch {
            // best-effort
          }
        }
      },
      onContent: (filePath, content) => {
        const match = filePath.match(SKILL_PATH_RE);
        if (!match) return content;
        return projectSkillReadContent(workspace, match[1], content);
      },
    }),
    createWriteTool(workspace),
    createEditTool(workspace),
    createLsTool(workspace),
    createGrepTool(workspace),
    createBashTool(workspace),
    createWebFetchTool(workspace),
    createWebSearchTool(),
    mcp.tool,
    createCalcTool(),
    createDatetimeTool(),
    createSenseTool(),
  ];

  const howlTool = createHowlTool({
    db,
    getCurrentSessionId: getParentSessionId,
    getHeadMessageId: () => {
      const sessionId = getParentSessionId();
      if (sessionId == null) return null;
      return getSession(db, sessionId)?.headMessageId ?? null;
    },
  });

  const wardenOnlyTools = createWardenTools(db);
  const chamberlainOnlyTools = createChamberlainTools(db);

  const mentorOnly = createMentorTools(db);
  const trainerOnly = createTrainerTools(workspace, db);
  const historianNightly = createHistorianNightlyTools(db);
  const historianOndemand = createHistorianOndemandTools(db);
  const stokeOnly = createStokeTools(db);

  const delegateHandler = createDelegateHandler({
    db,
    workspace,
    tools: sharedTools,
    mentorTools: mentorOnly,
    trainerTools: trainerOnly,
    historianOndemandTools: historianOndemand,
    wardenTools: wardenOnlyTools,
    chamberlainTools: chamberlainOnlyTools,
    chatFactory,
    getParentSessionId,
    onBackgroundComplete: config.onBackgroundComplete,
  });

  const STATE_SUFFIX: Partial<Record<number, string>> = {
    [MANDATORY_SOUL_IDS.warden]:
      "All agent state (memory, pack, quests, storylines) is only accessible through this tool.",
    [MANDATORY_SOUL_IDS.chamberlain]:
      "System config, secrets, and scheduling are only accessible through this tool.",
  };

  const specialistTools = listSouls(db)
    .filter((s) => s.id !== MANDATORY_SOUL_IDS.ghostpaw)
    .map((s) => {
      const slug = s.name.toLowerCase().replace(/\s+/g, "_");
      return createSpecialistDelegateTool(
        `ask_${slug}`,
        s.name,
        s.description,
        delegateHandler,
        STATE_SUFFIX[s.id],
      );
    });

  const checkRunTool = createCheckRunTool(db);

  const baseTools = [...specialistTools, checkRunTool, ...sharedTools, howlTool];
  const allToolsWithMentor = [...sharedTools, ...mentorOnly];
  const allToolsWithTrainer = [...sharedTools, ...trainerOnly];
  const allToolsWithHistorian = [...sharedTools, ...historianOndemand];

  return {
    baseTools,
    wardenTools: wardenOnlyTools,
    chamberlainTools: chamberlainOnlyTools,
    mentorTools: mentorOnly,
    trainerTools: trainerOnly,
    historianNightlyTools: historianNightly,
    historianOndemandTools: historianOndemand,
    stokeTools: [...stokeOnly, createRecallTool(db)],
    allToolsWithMentor,
    allToolsWithTrainer,
    allToolsWithHistorian,
    shutdown: () => mcp.shutdown(),
  };
}
