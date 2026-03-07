export const MEMBER_KINDS = ["human", "ghostpaw", "agent", "service", "other"] as const;
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
  kind: MemberKind;
  bond: string;
  trust: number;
  status: MemberStatus;
  isUser: boolean;
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
  createdAt: number;
}

export interface PackMemberSummary {
  id: number;
  name: string;
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
}

export interface UpdateBondInput {
  bond?: string;
  trust?: number;
  status?: MemberStatus;
  name?: string;
  isUser?: boolean;
}

export interface NoteInput {
  memberId: number;
  kind: InteractionKind;
  summary: string;
  significance?: number;
  sessionId?: number;
}

export interface AddContactInput {
  memberId: number;
  type: ContactType;
  value: string;
  label?: string;
}

export interface ListMembersOptions {
  status?: MemberStatus;
  kind?: MemberKind;
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
