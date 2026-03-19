export const MEMBER_KINDS = ["human", "group", "ghostpaw", "agent", "service", "other"] as const;
export type MemberKind = (typeof MEMBER_KINDS)[number];

export const MEMBER_STATUSES = ["active", "dormant", "lost"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const INTERACTION_KINDS = [
  "conversation",
  "correction",
  "conflict",
  "gift",
  "milestone",
  "observation",
  "transaction",
  "activity",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

export const CONTACT_TYPES = [
  "email",
  "phone",
  "website",
  "github",
  "gitlab",
  "twitter",
  "bluesky",
  "mastodon",
  "linkedin",
  "telegram",
  "discord",
  "slack",
  "signal",
  "other",
] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export interface PackMember {
  id: number;
  name: string;
  nickname: string | null;
  kind: MemberKind;
  bond: string;
  trust: number;
  status: MemberStatus;
  isUser: boolean;
  parentId: number | null;
  timezone: string | null;
  locale: string | null;
  location: string | null;
  address: string | null;
  pronouns: string | null;
  birthday: string | null;
  firstContact: number;
  lastContact: number;
  createdAt: number;
  updatedAt: number;
}

export interface PackContact {
  id: number;
  memberId: number;
  type: ContactType;
  value: string;
  label: string | null;
  createdAt: number;
}

export interface PackInteraction {
  id: number;
  memberId: number;
  kind: InteractionKind;
  summary: string;
  significance: number;
  sessionId: number | null;
  occurredAt: number | null;
  createdAt: number;
}

export interface PackField {
  key: string;
  value: string | null;
  updatedAt: number;
}

export interface PackLink {
  id: number;
  memberId: number;
  targetId: number;
  label: string;
  role: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PackMemberSummary {
  id: number;
  name: string;
  nickname: string | null;
  kind: MemberKind;
  trust: number;
  status: MemberStatus;
  lastContact: number;
  interactionCount: number;
}

export interface MeetInput {
  name: string;
  kind: MemberKind;
  bond?: string;
  isUser?: boolean;
  nickname?: string;
  parentId?: number;
  timezone?: string;
  locale?: string;
  location?: string;
  address?: string;
  pronouns?: string;
  birthday?: string;
  tags?: string[];
}

export interface UpdateBondInput {
  bond?: string;
  trust?: number;
  status?: MemberStatus;
  name?: string;
  isUser?: boolean;
  nickname?: string;
  timezone?: string;
  locale?: string;
  location?: string;
  address?: string;
  pronouns?: string;
  birthday?: string;
}

export interface MemberDetail {
  member: PackMember;
  interactions: PackInteraction[];
  contacts: PackContact[];
  fields: PackField[];
  links: PackLink[];
}

export interface NoteInput {
  memberId: number;
  kind: InteractionKind;
  summary: string;
  significance?: number;
  sessionId?: number;
  occurredAt?: number;
}

export interface AddContactInput {
  memberId: number;
  type: ContactType;
  value: string;
  label?: string;
}

export interface ListMembersOptions {
  status?: MemberStatus | MemberStatus[];
  kind?: MemberKind;
  field?: string;
  groupId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListInteractionsOptions {
  kind?: InteractionKind;
  limit?: number;
  offset?: number;
}

export interface ListContactsOptions {
  type?: ContactType;
}

export type TrustTier = "deep" | "solid" | "growing";

export interface DriftAlert {
  memberId: number;
  name: string;
  trust: number;
  tier: TrustTier;
  daysSilent: number;
  thresholdDays: number;
  source: "fallback" | "cadence";
  baselineDays?: number;
}

export interface Landmark {
  type: "birthday" | "anniversary";
  memberId: number;
  name: string;
  date: string;
  daysAway: number;
  yearsAgo?: number;
  summary?: string;
}

export interface PackPatrolItem {
  kind: "repair" | "reconnect" | "landmark";
  memberId: number;
  name: string;
  summary: string;
}

export interface PackDigest {
  drift: DriftAlert[];
  landmarks: Landmark[];
  patrol: PackPatrolItem[];
  stats: {
    activeMembers: number;
    recentInteractions: number;
    dormantMembers: number;
    averageTrust: number;
  };
  generatedAt: number;
}
