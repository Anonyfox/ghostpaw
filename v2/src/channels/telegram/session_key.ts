export function sessionKeyForChat(chatId: number): string {
  return `telegram:${chatId}`;
}

export function chatIdFromSessionKey(key: string): number | null {
  const match = key.match(/^telegram:(-?\d+)$/);
  return match ? Number(match[1]) : null;
}
