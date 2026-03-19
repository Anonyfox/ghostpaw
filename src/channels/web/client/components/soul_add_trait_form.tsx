import { useState } from "preact/hooks";
import { apiPost } from "../api_post.ts";

interface SoulAddTraitFormProps {
  soulId: number;
  onAdded: () => void;
}

export function SoulAddTraitForm({ soulId, onAdded }: SoulAddTraitFormProps) {
  const [principle, setPrinciple] = useState("");
  const [provenance, setProvenance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost(`/api/souls/${soulId}/traits`, { principle, provenance });
      setPrinciple("");
      setProvenance("");
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add trait.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} class="card card-body mb-3">
      <h6 class="mb-2">Add Trait</h6>
      <div class="mb-2">
        <input
          type="text"
          class="form-control form-control-sm"
          placeholder="Principle"
          value={principle}
          onInput={(e) => setPrinciple((e.target as HTMLInputElement).value)}
          required
        />
      </div>
      <div class="mb-2">
        <input
          type="text"
          class="form-control form-control-sm"
          placeholder="Provenance (evidence)"
          value={provenance}
          onInput={(e) => setProvenance((e.target as HTMLInputElement).value)}
          required
        />
      </div>
      {error && <div class="alert alert-danger py-1 px-2 small">{error}</div>}
      <button type="submit" class="btn btn-info btn-sm" disabled={saving}>
        {saving ? "Adding..." : "Add Trait"}
      </button>
    </form>
  );
}
