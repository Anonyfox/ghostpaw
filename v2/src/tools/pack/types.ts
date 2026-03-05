import type { InteractionKind, MemberKind, MemberStatus } from "../../core/pack/types.ts";

export interface FormattedMemberSummary {
  id: number;
  name: string;
  kind: MemberKind;
  trust: number;
  trust_level: string;
  status: MemberStatus;
  bond_excerpt: string;
  last_contact: string;
  interactions: number;
}

export interface FormattedMemberDetail {
  id: number;
  name: string;
  kind: MemberKind;
  trust: number;
  trust_level: string;
  status: MemberStatus;
  bond: string;
  first_contact: string;
  last_contact: string;
  metadata: Record<string, unknown>;
  recent_interactions: FormattedInteraction[];
}

export interface FormattedInteraction {
  id: number;
  kind: InteractionKind;
  summary: string;
  significance: number;
  age: string;
}
