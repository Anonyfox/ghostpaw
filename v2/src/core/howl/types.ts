export const HOWL_URGENCIES = ["low", "high"] as const;
export type HowlUrgency = (typeof HOWL_URGENCIES)[number];

export const HOWL_STATUSES = ["pending", "responded", "dismissed"] as const;
export type HowlStatus = (typeof HOWL_STATUSES)[number];

export interface Howl {
  id: number;
  sessionId: number;
  message: string;
  urgency: HowlUrgency;
  channel: string | null;
  status: HowlStatus;
  createdAt: number;
  respondedAt: number | null;
}

export interface StoreHowlInput {
  sessionId: number;
  message: string;
  urgency: HowlUrgency;
  channel?: string | null;
}

export interface HowlSummary {
  id: number;
  message: string;
  urgency: HowlUrgency;
  status: HowlStatus;
  channel: string | null;
  createdAt: number;
}
