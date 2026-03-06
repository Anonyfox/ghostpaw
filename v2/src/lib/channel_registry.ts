export interface ChannelHandle {
  type: "telegram" | "web";
  send(message: string): Promise<void>;
  isConnected(): boolean;
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

export function getBestChannel(): ChannelHandle | null {
  const connected = getConnectedChannels();
  if (connected.length === 0) return null;
  const telegram = connected.find((c) => c.type === "telegram");
  if (telegram) return telegram;
  return connected[0];
}

export function getChannel(id: string): ChannelHandle | null {
  return registry.get(id) ?? null;
}

export function clearChannelRegistry(): void {
  registry.clear();
}
