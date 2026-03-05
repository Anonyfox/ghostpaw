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

export interface PackMember {
  id: number;
  name: string;
  kind: MemberKind;
  bond: string;
  trust: number;
  status: MemberStatus;
  firstContact: number;
  lastContact: number;
  metadata: string;
  createdAt: number;
  updatedAt: number;
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
  metadata?: string;
}

export interface UpdateBondInput {
  bond?: string;
  trust?: number;
  status?: MemberStatus;
  metadata?: string;
  name?: string;
}

export interface NoteInput {
  memberId: number;
  kind: InteractionKind;
  summary: string;
  significance?: number;
  sessionId?: number;
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
