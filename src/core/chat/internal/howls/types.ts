import type { HowlDeliveryMode } from "../../../../lib/channel_registry.ts";

export const HOWL_URGENCIES = ["low", "high"] as const;
export type HowlUrgency = (typeof HOWL_URGENCIES)[number];

export const HOWL_STATUSES = ["pending", "responded", "dismissed"] as const;
export type HowlStatus = (typeof HOWL_STATUSES)[number];

export interface Howl {
  id: number;
  sessionId: number;
  originSessionId: number;
  originMessageId: number | null;
  message: string;
  urgency: HowlUrgency;
  channel: string | null;
  deliveryAddress: string | null;
  deliveryMessageId: string | null;
  deliveryMode: HowlDeliveryMode | null;
  status: HowlStatus;
  createdAt: number;
  respondedAt: number | null;
  responseMessageId: number | null;
}

export interface StoreHowlInput {
  sessionId: number;
  originSessionId: number;
  originMessageId?: number | null;
  message: string;
  urgency: HowlUrgency;
  channel?: string | null;
  deliveryAddress?: string | null;
  deliveryMessageId?: string | null;
  deliveryMode?: HowlDeliveryMode | null;
}

export interface CreateHowlInput {
  originSessionId: number;
  originMessageId?: number | null;
  message: string;
  urgency: HowlUrgency;
  channel?: string | null;
  deliveryAddress?: string | null;
  deliveryMessageId?: string | null;
  deliveryMode?: HowlDeliveryMode | null;
}

export interface HowlSummary {
  id: number;
  sessionId: number;
  message: string;
  urgency: HowlUrgency;
  status: HowlStatus;
  channel: string | null;
  deliveryMode: HowlDeliveryMode | null;
  createdAt: number;
}
