export type ChannelType = "telegram" | "web";

export type HowlDeliveryMode = "push" | "inbox";

export interface HowlDeliveryRequest {
  howlId: number;
  sessionId: number;
  message: string;
  urgency: "low" | "high";
}

export interface HowlDeliveryReceipt {
  channel: ChannelType;
  delivered: boolean;
  mode: HowlDeliveryMode;
  address: string | null;
  messageId: string | null;
}

export interface HowlChannelCapabilities {
  canPush: boolean;
  canInbox: boolean;
  explicitReply: boolean;
  priority: number;
}

export interface ChannelHandle {
  type: ChannelType;
  isConnected(): boolean;
  getHowlCapabilities(): HowlChannelCapabilities;
  deliverHowl(request: HowlDeliveryRequest): Promise<HowlDeliveryReceipt>;
}

const registry = new Map<string, ChannelHandle>();

export function registerChannel(id: string, handle: ChannelHandle): void {
  registry.set(id, handle);
}

export function unregisterChannel(id: string): void {
  registry.delete(id);
}

export function getConnectedChannels(): ChannelHandle[] {
  return [...registry.values()].filter((h) => h.isConnected());
}

export function selectHowlChannel(urgency: "low" | "high"): ChannelHandle | null {
  const connected = getConnectedChannels();
  if (connected.length === 0) return null;

  const candidates = connected.filter((channel) => {
    const caps = channel.getHowlCapabilities();
    if (urgency === "high") return caps.canPush;
    return caps.canInbox || caps.canPush;
  });
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    const leftCaps = left.getHowlCapabilities();
    const rightCaps = right.getHowlCapabilities();
    const leftScore = scoreHowlChannel(leftCaps, urgency);
    const rightScore = scoreHowlChannel(rightCaps, urgency);
    return rightScore - leftScore;
  });

  return candidates[0] ?? null;
}

export function getChannel(id: string): ChannelHandle | null {
  return registry.get(id) ?? null;
}

export function clearChannelRegistry(): void {
  registry.clear();
}

function scoreHowlChannel(caps: HowlChannelCapabilities, urgency: "low" | "high"): number {
  if (urgency === "high") {
    return caps.priority + (caps.explicitReply ? 10 : 0) + (caps.canPush ? 100 : 0);
  }

  if (caps.canInbox) {
    return caps.priority + (caps.explicitReply ? 10 : 0) + 100;
  }

  return caps.priority + (caps.explicitReply ? 10 : 0) + (caps.canPush ? 25 : 0);
}
