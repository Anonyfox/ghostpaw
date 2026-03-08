import type {
  ContactType,
  InteractionKind,
  MemberKind,
  MemberStatus,
} from "../../core/pack/types.ts";

export interface FormattedMemberSummary {
  id: number;
  name: string;
  nickname: string | null;
  kind: MemberKind;
  trust: number;
  trust_level: string;
  status: MemberStatus;
  bond_excerpt: string;
  last_contact: string;
  interactions: number;
}

export interface FormattedContact {
  type: ContactType;
  value: string;
  label: string | null;
}

export interface FormattedFieldEntry {
  key: string;
  value: string | null;
}

export interface FormattedLinkEntry {
  target_id: number;
  target_name: string;
  label: string;
  role: string | null;
  active: boolean;
}

export interface FormattedMemberDetail {
  id: number;
  name: string;
  nickname: string | null;
  kind: MemberKind;
  status: MemberStatus;
  trust: number;
  trust_level: string;
  is_user: boolean;
  bond: string;
  parent_id: number | null;
  timezone: string | null;
  locale: string | null;
  location: string | null;
  address: string | null;
  pronouns: string | null;
  birthday: string | null;
  first_contact: string;
  last_contact: string;
  tags: string[];
  fields: FormattedFieldEntry[];
  links: FormattedLinkEntry[];
  contacts: FormattedContact[];
  recent_interactions: FormattedInteraction[];
}

export interface FormattedInteraction {
  id: number;
  kind: InteractionKind;
  summary: string;
  significance: number;
  age: string;
  event_date?: string;
}
