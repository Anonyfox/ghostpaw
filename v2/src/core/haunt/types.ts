export interface Haunt {
  id: number;
  sessionId: number;
  rawJournal: string;
  summary: string;
  seededMemoryIds: number[];
  createdAt: number;
}

export interface StoreHauntInput {
  sessionId: number;
  rawJournal: string;
  summary: string;
  seededMemoryIds?: number[];
}

export interface HauntSummary {
  id: number;
  summary: string;
  createdAt: number;
}
