import { useCallback, useEffect, useState } from "preact/hooks";
import type { DistillStatusResponse } from "../../shared/distill_types.ts";
import type {
  MemoryInfo,
  MemoryListResponse,
  MemorySearchResponse,
  MemoryStatsResponse,
} from "../../shared/memory_types.ts";
import { apiGet } from "../api_get.ts";
import { apiPost } from "../api_post.ts";
import { DistillBanner } from "../components/distill_banner.tsx";
import { MemoryAddForm } from "../components/memory_add_form.tsx";
import { MemoryDetail } from "../components/memory_detail.tsx";
import { MemoryRow } from "../components/memory_row.tsx";
import { MemoryStatsBar } from "../components/memory_stats_bar.tsx";
import { type MemorySortOption, MemoryToolbar } from "../components/memory_toolbar.tsx";

export function MemoriesPage() {
  const [stats, setStats] = useState<MemoryStatsResponse | null>(null);
  const [memories, setMemories] = useState<MemoryInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("");
  const [strength, setStrength] = useState("");
  const [sort, setSort] = useState<MemorySortOption>("newest");
  const [staleOnly, setStaleOnly] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeText, setMergeText] = useState("");
  const [showMerge, setShowMerge] = useState(false);
  const [distillStatus, setDistillStatus] = useState<DistillStatusResponse | null>(null);

  const fetchDistillStatus = useCallback(() => {
    apiGet<DistillStatusResponse>("/api/distill/status")
      .then(setDistillStatus)
      .catch(() => {});
  }, []);

  const fetchStats = useCallback(() => {
    apiGet<MemoryStatsResponse>("/api/memories/stats")
      .then(setStats)
      .catch(() => {});
  }, []);

  const fetchList = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (strength) params.set("strength", strength);
    if (sort) params.set("sort", sort);
    if (staleOnly) params.set("stale", "1");
    params.set("limit", "200");

    apiGet<MemoryListResponse>(`/api/memories?${params}`)
      .then((res) => {
        setMemories(res.memories);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, strength, sort, staleOnly]);

  const fetchSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        fetchList();
        return;
      }
      setLoading(true);
      const params = new URLSearchParams({ q });
      if (category) params.set("category", category);

      apiGet<MemorySearchResponse>(`/api/memories/search?${params}`)
        .then((res) => {
          setMemories(res.memories);
          setTotal(res.memories.length);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [category, fetchList],
  );

  useEffect(() => {
    fetchStats();
    fetchDistillStatus();
  }, [fetchStats, fetchDistillStatus]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchList();
    }
  }, [fetchList, searchQuery]);

  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      setStaleOnly(false);
      fetchSearch(q);
    },
    [fetchSearch],
  );

  const handleDistillComplete = useCallback(() => {
    fetchStats();
    fetchList();
    fetchDistillStatus();
  }, [fetchStats, fetchList, fetchDistillStatus]);

  const handleShowStale = useCallback(() => {
    setStaleOnly(true);
    setSearchQuery("");
    setCategory("");
    setStrength("");
    setSort("stalest");
  }, []);

  const handleConfirm = useCallback(
    (id: number) => {
      apiPost<MemoryInfo>(`/api/memories/${id}/confirm`)
        .then((updated) => {
          setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
          fetchStats();
        })
        .catch(() => {});
    },
    [fetchStats],
  );

  const handleForget = useCallback(
    (id: number) => {
      apiPost(`/api/memories/${id}/forget`)
        .then(() => {
          setMemories((prev) => prev.filter((m) => m.id !== id));
          setTotal((t) => t - 1);
          setExpandedId(null);
          fetchStats();
        })
        .catch(() => {});
    },
    [fetchStats],
  );

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleUpdated = useCallback(
    (updated: MemoryInfo) => {
      fetchList();
      fetchStats();
      setExpandedId(updated.id);
    },
    [fetchList, fetchStats],
  );

  const handleCreated = useCallback(
    (_mem: MemoryInfo) => {
      setShowAddForm(false);
      fetchList();
      fetchStats();
    },
    [fetchList, fetchStats],
  );

  const handleToggleSelect = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
        setShowMerge(false);
      }
      return !prev;
    });
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleMergeStart = useCallback(() => {
    const selected = memories.filter((m) => selectedIds.has(m.id));
    setMergeText(selected.map((m) => m.claim).join("\n\n"));
    setShowMerge(true);
  }, [memories, selectedIds]);

  const handleMergeSubmit = useCallback(async () => {
    if (!mergeText.trim() || selectedIds.size < 2) return;
    try {
      await apiPost("/api/memories/merge", {
        ids: [...selectedIds],
        claim: mergeText.trim(),
      });
      setShowMerge(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      fetchList();
      fetchStats();
    } catch {
      /* handled by API */
    }
  }, [mergeText, selectedIds, fetchList, fetchStats]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div>
      <h4 class="mb-3 text-body">Memories</h4>

      <DistillBanner status={distillStatus} onComplete={handleDistillComplete} />

      <MemoryStatsBar stats={stats} onShowStale={handleShowStale} />

      <MemoryToolbar
        searchQuery={searchQuery}
        onSearch={handleSearch}
        category={category}
        onCategoryChange={(c) => {
          setCategory(c);
          setStaleOnly(false);
        }}
        strength={strength}
        onStrengthChange={(s) => {
          setStrength(s);
          setStaleOnly(false);
        }}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setStaleOnly(false);
        }}
        selectMode={selectMode}
        onToggleSelect={handleToggleSelect}
        selectedCount={selectedIds.size}
        onMerge={handleMergeStart}
        onAdd={() => setShowAddForm(true)}
      />

      {showAddForm && (
        <MemoryAddForm onCreated={handleCreated} onCancel={() => setShowAddForm(false)} />
      )}

      {staleOnly && (
        <div class="alert alert-warning py-2 small mb-3">
          Showing memories that may need review — high evidence but long since verified.
          <button
            type="button"
            class="btn btn-sm btn-link text-warning p-0 ms-2"
            onClick={() => {
              setStaleOnly(false);
              setSort("newest");
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      {loading ? (
        <div class="text-body-tertiary small">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div class="text-body-tertiary text-center py-5">
          {isSearching ? "No memories match your search." : "No memories yet."}
        </div>
      ) : (
        <div>
          <div class="text-body-tertiary small mb-2">
            {isSearching ? `${total} result${total !== 1 ? "s" : ""}` : `${total} memories`}
          </div>
          <div class="border rounded">
            {memories.map((m) => (
              <div key={m.id}>
                <MemoryRow
                  memory={m}
                  isExpanded={expandedId === m.id}
                  onToggle={handleToggleExpand}
                  onConfirm={handleConfirm}
                  onForget={handleForget}
                  selectMode={selectMode}
                  selected={selectedIds.has(m.id)}
                  onSelect={handleSelect}
                  isSearchResult={isSearching}
                />
                {expandedId === m.id && !selectMode && (
                  <MemoryDetail
                    memoryId={m.id}
                    onConfirm={handleConfirm}
                    onForget={handleForget}
                    onUpdated={handleUpdated}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showMerge && (
        <div class="position-fixed bottom-0 start-0 end-0 bg-body-secondary border-top p-3">
          <div class="container-fluid" style="max-width: 800px;">
            <h6 class="text-body mb-2">Merge {selectedIds.size} memories</h6>
            <textarea
              class="form-control form-control-sm mb-2"
              rows={4}
              placeholder="Write the combined claim..."
              value={mergeText}
              onInput={(e) => setMergeText((e.target as HTMLTextAreaElement).value)}
            />
            <div class="d-flex gap-2">
              <button
                type="button"
                class="btn btn-sm btn-info"
                disabled={!mergeText.trim()}
                onClick={handleMergeSubmit}
              >
                Merge
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                onClick={() => setShowMerge(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
