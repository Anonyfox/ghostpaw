import { useEffect, useState } from "preact/hooks";
import { Link, useParams } from "wouter-preact";
import type {
  PackContactInfo,
  PackFieldInfo,
  PackLinkInfo,
  PackMemberDetailResponse,
} from "../../shared/pack_types.ts";
import { apiGet } from "../api_get.ts";
import { PackCommandBox } from "../components/pack_command_box.tsx";
import { PackInteractionTimeline } from "../components/pack_interaction_timeline.tsx";
import { PackKindBadge } from "../components/pack_kind_badge.tsx";
import { PackTrustPips } from "../components/pack_trust_pips.tsx";
import { relativeTime } from "../relative_time.ts";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_BADGES: Record<string, string> = {
  active: "bg-success",
  dormant: "bg-secondary",
  lost: "bg-danger",
};

function ProfileCard({ member }: { member: PackMemberDetailResponse }) {
  return (
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Profile</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <div class="mb-2 small">
              <span class="text-body-secondary">Kind:</span> <PackKindBadge kind={member.kind} />
            </div>
            {member.parentName && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Parent:</span> {member.parentName}
              </div>
            )}
            {member.timezone && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Timezone:</span> {member.timezone}
              </div>
            )}
            {member.locale && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Locale:</span> {member.locale}
              </div>
            )}
            {member.location && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Location:</span> {member.location}
              </div>
            )}
            {member.address && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Address:</span> {member.address}
              </div>
            )}
            {member.pronouns && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Pronouns:</span> {member.pronouns}
              </div>
            )}
            {member.birthday && (
              <div class="mb-2 small">
                <span class="text-body-secondary">Birthday:</span> {member.birthday}
              </div>
            )}
          </div>
          <div class="col-md-6">
            <div class="mb-2 small">
              <span class="text-body-secondary">First contact:</span>{" "}
              {formatDate(member.firstContact)}
            </div>
            <div class="mb-2 small">
              <span class="text-body-secondary">Last contact:</span>{" "}
              {relativeTime(member.lastContact)}
            </div>
            <div class="mb-2 small">
              <span class="text-body-secondary">Created:</span> {formatDate(member.createdAt)}
            </div>
            <div class="mb-2 small">
              <span class="text-body-secondary">Updated:</span> {relativeTime(member.updatedAt)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TagsCard({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Tags</h5>
        <div class="d-flex flex-wrap gap-1">
          {tags.map((t) => (
            <span key={t} class="badge bg-info bg-opacity-25 text-info">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldsCard({ fields }: { fields: PackFieldInfo[] }) {
  if (fields.length === 0) return null;
  return (
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Fields</h5>
        {fields.map((f) => (
          <div key={f.key} class="mb-1 small">
            <span class="text-body-secondary">{f.key}:</span> {f.value}
          </div>
        ))}
      </div>
    </div>
  );
}

function LinksCard({ links }: { links: PackLinkInfo[] }) {
  if (links.length === 0) return null;
  return (
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Links</h5>
        {links.map((l) => (
          <div key={l.id} class="mb-1 small">
            <span class="text-body-secondary">{l.label}</span> &rarr;{" "}
            <Link href={`/pack/${l.targetId}`} class="text-info text-decoration-none">
              {l.targetName}
            </Link>
            {l.role && <span class="text-muted ms-1">({l.role})</span>}
            {!l.active && <span class="badge bg-secondary ms-1">former</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactsCard({ contacts }: { contacts: PackContactInfo[] }) {
  if (contacts.length === 0) return null;
  return (
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Contacts</h5>
        {contacts.map((c) => (
          <div key={c.id} class="mb-1 small">
            <span class="text-body-secondary">{c.type}:</span> {c.value}
            {c.label && <span class="text-muted ms-1">({c.label})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PackDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [member, setMember] = useState<PackMemberDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await apiGet<PackMemberDetailResponse>(`/api/pack/${id}`);
      setMember(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load member.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  if (loading) return <p class="text-muted">Loading...</p>;
  if (!member) return <p class="text-danger">{error ?? "Member not found."}</p>;

  const tags = (member.fields ?? []).filter((f) => f.value === null).map((f) => f.key);
  const dataFields = (member.fields ?? []).filter((f) => f.value !== null);

  return (
    <div>
      <Link href="/pack" class="text-muted small text-decoration-none">
        &larr; Back to Pack
      </Link>

      {error && <div class="alert alert-danger mt-2">{error}</div>}

      <div class="d-flex justify-content-between align-items-start mt-3 mb-3">
        <div>
          <h3 class="mb-1">
            {member.name}
            {member.nickname && <small class="text-muted ms-2">"{member.nickname}"</small>}
          </h3>
          <div class="d-flex align-items-center gap-2">
            <PackKindBadge kind={member.kind} />
            <span class={`badge ${STATUS_BADGES[member.status] ?? "bg-secondary"}`}>
              {member.status}
            </span>
          </div>
        </div>
        <div class="text-end">
          <PackTrustPips trust={member.trust} size="md" />
          <small class="text-body-tertiary d-block mt-1">
            Trust: {(member.trust * 100).toFixed(0)}% ({member.trustLevel})
          </small>
        </div>
      </div>

      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title">Bond</h5>
          <div class="mt-2" style="white-space: pre-wrap;">
            {member.bond || <em class="text-muted">No bond narrative yet.</em>}
          </div>
        </div>
      </div>

      <ProfileCard member={member} />
      <TagsCard tags={tags} />
      <FieldsCard fields={dataFields} />
      <LinksCard links={member.links ?? []} />
      <ContactsCard contacts={member.contacts ?? []} />

      <div class="card mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Interaction Journal</h5>
          <PackInteractionTimeline interactions={member.interactions} />
        </div>
      </div>

      <PackCommandBox
        memberId={id}
        onSuccess={load}
        placeholder={`e.g. 'set timezone to Europe/Berlin' or 'add tag vip'`}
      />
    </div>
  );
}
