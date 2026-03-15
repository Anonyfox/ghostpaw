import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "trail", description: "Trail — longitudinal interpretive layer" },
  subCommands: {
    state: () => import("./trail_state.ts").then((m) => m.default),
    chronicle: () => import("./trail_chronicle.ts").then((m) => m.default),
    wisdom: () => import("./trail_wisdom.ts").then((m) => m.default),
    loops: () => import("./trail_loops.ts").then((m) => m.default),
    sweep: () => import("./trail_sweep.ts").then((m) => m.default),
  },
});
