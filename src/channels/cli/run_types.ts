export interface RunInput {
  prompt: string;
  model?: string;
}

export interface RunResult {
  succeeded: boolean;
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  totalTokens: number;
}
