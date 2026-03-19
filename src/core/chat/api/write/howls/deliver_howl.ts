import { selectHowlChannel } from "../../../../../lib/channel_registry.ts";
import type { DatabaseHandle } from "../../../../../lib/index.ts";
import type { Howl } from "../../../internal/howls/types.ts";
import { updateHowlDelivery } from "../../../internal/howls/update_howl.ts";

export async function deliverHowl(
  db: DatabaseHandle,
  howl: Howl,
): Promise<{
  delivered: boolean;
  channel: string;
  mode: string;
}> {
  const channel = selectHowlChannel(howl.urgency);
  if (!channel) {
    return {
      delivered: false,
      channel: "stored",
      mode: "stored",
    };
  }

  const receipt = await channel.deliverHowl({
    howlId: howl.id,
    sessionId: howl.sessionId,
    message: howl.message,
    urgency: howl.urgency,
    originMessageId: howl.originMessageId ?? undefined,
  });

  updateHowlDelivery(db, howl.id, {
    channel: receipt.channel,
    deliveryAddress: receipt.address,
    deliveryMessageId: receipt.messageId,
    deliveryMode: receipt.mode,
  });

  return {
    delivered: receipt.delivered,
    channel: receipt.channel,
    mode: receipt.mode,
  };
}
