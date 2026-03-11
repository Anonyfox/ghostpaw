import type { DatabaseHandle } from "../../lib/index.ts";
import { rowToMember } from "./internal/rows/row_to_member.ts";
import type { PackMember } from "./types.ts";

type MemberTextField =
  | "nickname"
  | "timezone"
  | "locale"
  | "location"
  | "address"
  | "pronouns"
  | "birthday";

type FieldRow = {
  key: string;
  value: string | null;
  updated_at: number;
};

type LinkRow = {
  id: number;
  member_id: number;
  target_id: number;
  label: string;
};

type ContactRow = {
  type: string;
  value: string;
  label: string | null;
};

type MergeChoiceSource = "keep" | "merge" | "same";

export interface MergeMemberChoice {
  field: string;
  keepValue: string | number | null;
  mergeValue: string | number | null;
  chosenValue: string | number | null;
  chosenSource: MergeChoiceSource;
}

export interface MergeFieldConflict {
  key: string;
  keepValue: string | null;
  mergeValue: string | null;
  chosenValue: string | null;
  chosenSource: MergeChoiceSource;
}

export interface MergeContactOverlap {
  type: string;
  value: string;
  keepLabel: string | null;
  mergeLabel: string | null;
}

export interface MergeLinkConflict {
  direction: "outgoing" | "incoming";
  memberId: number;
  targetId: number;
  label: string;
  resolution: "keep" | "delete-self";
}

export interface MergeInteractionPreview {
  keepCount: number;
  mergeCount: number;
  combinedCount: number;
  earliestAt: number | null;
  latestAt: number | null;
}

export interface MergeMemberPreview {
  keepMember: PackMember;
  mergeMember: PackMember;
  memberChoices: MergeMemberChoice[];
  overlappingContacts: MergeContactOverlap[];
  fieldConflicts: MergeFieldConflict[];
  linkConflicts: MergeLinkConflict[];
  interactions: MergeInteractionPreview;
}

const MEMBER_TEXT_FIELDS: MemberTextField[] = [
  "nickname",
  "timezone",
  "locale",
  "location",
  "address",
  "pronouns",
  "birthday",
];

function chooseTextValue(
  keepValue: string | null,
  mergeValue: string | null,
  keepUpdatedAt: number,
  mergeUpdatedAt: number,
): { chosenValue: string | null; chosenSource: MergeChoiceSource } {
  if (keepValue === mergeValue) {
    return { chosenValue: keepValue, chosenSource: "same" };
  }
  if (keepValue === null) {
    return { chosenValue: mergeValue, chosenSource: "merge" };
  }
  if (mergeValue === null) {
    return { chosenValue: keepValue, chosenSource: "keep" };
  }
  if (mergeUpdatedAt > keepUpdatedAt) {
    return { chosenValue: mergeValue, chosenSource: "merge" };
  }
  return { chosenValue: keepValue, chosenSource: "keep" };
}

function chooseParentId(
  keep: PackMember,
  merge: PackMember,
): {
  chosenValue: number | null;
  chosenSource: MergeChoiceSource;
} {
  const keepParent = keep.parentId === keep.id || keep.parentId === merge.id ? null : keep.parentId;
  const mergeParent =
    merge.parentId === keep.id || merge.parentId === merge.id ? null : merge.parentId;
  if (keepParent === mergeParent) {
    return { chosenValue: keepParent, chosenSource: "same" };
  }
  if (keepParent === null) {
    return { chosenValue: mergeParent, chosenSource: "merge" };
  }
  if (mergeParent === null) {
    return { chosenValue: keepParent, chosenSource: "keep" };
  }
  if (merge.updatedAt > keep.updatedAt) {
    return { chosenValue: mergeParent, chosenSource: "merge" };
  }
  return { chosenValue: keepParent, chosenSource: "keep" };
}

function getMemberRow(db: DatabaseHandle, id: number): PackMember {
  const row = db.prepare("SELECT * FROM pack_members WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) {
    throw new Error(`Pack member with id ${id} not found.`);
  }
  return rowToMember(row);
}

function getLinkConflicts(
  db: DatabaseHandle,
  keepId: number,
  mergeId: number,
): MergeLinkConflict[] {
  const conflicts: MergeLinkConflict[] = [];

  const keepOutgoing = new Set(
    (
      db.prepare("SELECT target_id, label FROM pack_links WHERE member_id = ?").all(keepId) as {
        target_id: number;
        label: string;
      }[]
    ).map((row) => `${row.target_id}:${row.label}`),
  );
  const mergeOutgoing = db
    .prepare("SELECT id, member_id, target_id, label FROM pack_links WHERE member_id = ?")
    .all(mergeId) as LinkRow[];
  for (const link of mergeOutgoing) {
    if (link.target_id === keepId) {
      conflicts.push({
        direction: "outgoing",
        memberId: keepId,
        targetId: keepId,
        label: link.label,
        resolution: "delete-self",
      });
      continue;
    }
    if (keepOutgoing.has(`${link.target_id}:${link.label}`)) {
      conflicts.push({
        direction: "outgoing",
        memberId: keepId,
        targetId: link.target_id,
        label: link.label,
        resolution: "keep",
      });
    }
  }

  const keepIncoming = new Set(
    (
      db.prepare("SELECT member_id, label FROM pack_links WHERE target_id = ?").all(keepId) as {
        member_id: number;
        label: string;
      }[]
    ).map((row) => `${row.member_id}:${row.label}`),
  );
  const mergeIncoming = db
    .prepare("SELECT id, member_id, target_id, label FROM pack_links WHERE target_id = ?")
    .all(mergeId) as LinkRow[];
  for (const link of mergeIncoming) {
    if (link.member_id === keepId) {
      conflicts.push({
        direction: "incoming",
        memberId: keepId,
        targetId: keepId,
        label: link.label,
        resolution: "delete-self",
      });
      continue;
    }
    if (keepIncoming.has(`${link.member_id}:${link.label}`)) {
      conflicts.push({
        direction: "incoming",
        memberId: link.member_id,
        targetId: keepId,
        label: link.label,
        resolution: "keep",
      });
    }
  }

  return conflicts;
}

export function previewMergeMember(
  db: DatabaseHandle,
  keepId: number,
  mergeId: number,
): MergeMemberPreview {
  if (keepId === mergeId) {
    throw new Error("Cannot preview a merge with itself.");
  }

  const keepMember = getMemberRow(db, keepId);
  const mergeMember = getMemberRow(db, mergeId);
  if (keepMember.status === "lost") {
    throw new Error(`Pack member ${keepId} is lost — cannot merge into it.`);
  }
  if (mergeMember.status === "lost") {
    throw new Error(`Pack member ${mergeId} is already lost — cannot merge.`);
  }

  const memberChoices: MergeMemberChoice[] = MEMBER_TEXT_FIELDS.map((field) => {
    const decision = chooseTextValue(
      keepMember[field],
      mergeMember[field],
      keepMember.updatedAt,
      mergeMember.updatedAt,
    );
    return {
      field,
      keepValue: keepMember[field],
      mergeValue: mergeMember[field],
      chosenValue: decision.chosenValue,
      chosenSource: decision.chosenSource,
    };
  });

  const parentChoice = chooseParentId(keepMember, mergeMember);
  memberChoices.push({
    field: "parent_id",
    keepValue: keepMember.parentId,
    mergeValue: mergeMember.parentId,
    chosenValue: parentChoice.chosenValue,
    chosenSource: parentChoice.chosenSource,
  });
  memberChoices.push({
    field: "first_contact",
    keepValue: keepMember.firstContact,
    mergeValue: mergeMember.firstContact,
    chosenValue: Math.min(keepMember.firstContact, mergeMember.firstContact),
    chosenSource:
      keepMember.firstContact === mergeMember.firstContact
        ? "same"
        : keepMember.firstContact < mergeMember.firstContact
          ? "keep"
          : "merge",
  });
  memberChoices.push({
    field: "last_contact",
    keepValue: keepMember.lastContact,
    mergeValue: mergeMember.lastContact,
    chosenValue: Math.max(keepMember.lastContact, mergeMember.lastContact),
    chosenSource:
      keepMember.lastContact === mergeMember.lastContact
        ? "same"
        : keepMember.lastContact > mergeMember.lastContact
          ? "keep"
          : "merge",
  });
  memberChoices.push({
    field: "trust",
    keepValue: keepMember.trust,
    mergeValue: mergeMember.trust,
    chosenValue: Math.max(keepMember.trust, mergeMember.trust),
    chosenSource:
      keepMember.trust === mergeMember.trust
        ? "same"
        : keepMember.trust > mergeMember.trust
          ? "keep"
          : "merge",
  });

  const keepContacts = db
    .prepare("SELECT type, value, label FROM pack_contacts WHERE member_id = ?")
    .all(keepId) as ContactRow[];
  const mergeContacts = db
    .prepare("SELECT type, value, label FROM pack_contacts WHERE member_id = ?")
    .all(mergeId) as ContactRow[];
  const keepContactMap = new Map(
    keepContacts.map((contact) => [`${contact.type}:${contact.value}`, contact]),
  );
  const overlappingContacts = mergeContacts
    .filter((contact) => keepContactMap.has(`${contact.type}:${contact.value}`))
    .map((contact) => {
      const keepContact = keepContactMap.get(`${contact.type}:${contact.value}`) as ContactRow;
      return {
        type: contact.type,
        value: contact.value,
        keepLabel: keepContact.label,
        mergeLabel: contact.label,
      };
    });

  const keepFields = new Map(
    (
      db
        .prepare("SELECT key, value, updated_at FROM pack_fields WHERE member_id = ?")
        .all(keepId) as FieldRow[]
    ).map((field) => [field.key, field]),
  );
  const mergeFields = db
    .prepare("SELECT key, value, updated_at FROM pack_fields WHERE member_id = ?")
    .all(mergeId) as FieldRow[];
  const fieldConflicts = mergeFields
    .filter((field) => keepFields.has(field.key))
    .map((field) => {
      const keepField = keepFields.get(field.key) as FieldRow;
      const decision = chooseTextValue(
        keepField.value,
        field.value,
        keepField.updated_at,
        field.updated_at,
      );
      return {
        key: field.key,
        keepValue: keepField.value,
        mergeValue: field.value,
        chosenValue: decision.chosenValue,
        chosenSource: decision.chosenSource,
      };
    })
    .filter((field) => field.keepValue !== field.mergeValue);

  const interactionStats = db
    .prepare(
      `SELECT
         SUM(CASE WHEN member_id = ? THEN 1 ELSE 0 END) AS keep_count,
         SUM(CASE WHEN member_id = ? THEN 1 ELSE 0 END) AS merge_count,
         COUNT(*) AS combined_count,
         MIN(COALESCE(occurred_at, created_at)) AS earliest_at,
         MAX(COALESCE(occurred_at, created_at)) AS latest_at
       FROM pack_interactions
       WHERE member_id IN (?, ?)`,
    )
    .get(keepId, mergeId, keepId, mergeId) as {
    keep_count: number | null;
    merge_count: number | null;
    combined_count: number;
    earliest_at: number | null;
    latest_at: number | null;
  };

  return {
    keepMember,
    mergeMember,
    memberChoices,
    overlappingContacts,
    fieldConflicts,
    linkConflicts: getLinkConflicts(db, keepId, mergeId),
    interactions: {
      keepCount: interactionStats.keep_count ?? 0,
      mergeCount: interactionStats.merge_count ?? 0,
      combinedCount: interactionStats.combined_count,
      earliestAt: interactionStats.earliest_at,
      latestAt: interactionStats.latest_at,
    },
  };
}
