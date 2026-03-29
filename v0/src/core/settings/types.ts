export type SettingType = "string" | "integer" | "number" | "boolean";
export type SettingSource = "user" | "chat" | "env";

export const CATEGORIES = [
  "provider",
  "search",
  "channel",
  "model",
  "agent",
  "interceptor",
  "pulse",
  "tools",
] as const;

export type SettingCategory = (typeof CATEGORIES)[number] | "custom";

export interface KnownSetting {
  defaultValue?: string;
  type: SettingType;
  secret: boolean;
  category: SettingCategory;
  description: string;
  validate?: (v: string) => string | null;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  type: SettingType;
  secret: boolean;
  source: SettingSource;
  next_id: number | null;
  created_at: string;
}
