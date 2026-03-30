export interface ShadeImpression {
  id: number;
  session_id: number;
  sealed_msg_id: number;
  soul_id: number;
  impressions: string;
  impression_count: number;
  ingest_session_id: number | null;
  created_at: string;
}

export interface ShadeRun {
  id: number;
  impression_id: number;
  processor: string;
  status: "running" | "done" | "error";
  result_count: number | null;
  process_session_id: number | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}
