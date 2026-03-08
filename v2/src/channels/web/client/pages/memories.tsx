import { useCallback, useEffect, useState } from "preact/hooks";
import type { DistillStatusResponse } from "../../shared/distill_types.ts";
import type {
  MemoryInfo,
  MemoryListResponse,
  MemorySearchResponse,
  MemoryStatsResponse,
} from "../../shared/memory_types.ts";
import { apiGet } from "../api_get.ts";
import { DistillBanner } from "../components/distill_banner.tsx";
import { MemoryCommandBox } from "../components/memory_command_box.tsx";
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

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const refreshAll = useCallback(() => {
    fetchList();
    fetchStats();
  }, [fetchList, fetchStats]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div>
      <h4 class="mb-3 text-body">Memories</h4>

      <MemoryCommandBox onSuccess={refreshAll} />

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
      />

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
                  isSearchResult={isSearching}
                />
                {expandedId === m.id && <MemoryDetail memoryId={m.id} onSuccess={refreshAll} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
