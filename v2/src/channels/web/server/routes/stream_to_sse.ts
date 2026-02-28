import type { ServerResponse } from "node:http";
import type { TurnResult } from "../../../../core/chat/index.ts";

export async function streamToSse(
  gen: AsyncGenerator<string, TurnResult>,
  res: ServerResponse,
): Promise<void> {
  try {
    for (;;) {
      const next = await gen.next();
      if (next.done) {
        const result: TurnResult = next.value;
        const donePayload = JSON.stringify({
          messageId: result.messageId,
          model: result.model,
          usage: result.usage,
          cost: result.cost,
        });
        res.write(`event: done\ndata: ${donePayload}\n\n`);
        return;
      }
      const chunk = next.value;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.write(`event: error\ndata: ${JSON.stringify(msg)}\n\n`);
  }
}
