export type GhostpawErrorCode =
  | "ERR_UNKNOWN"
  | "ERR_CONFIG"
  | "ERR_DATABASE"
  | "ERR_TOOL"
  | "ERR_BUDGET"
  | "ERR_PROVIDER"
  | "ERR_VALIDATION"
  | "ERR_SESSION"
  | "ERR_COMPACTION";

export interface GhostpawErrorOptions {
  cause?: unknown;
  hint?: string;
}

export class GhostpawError extends Error {
  readonly code: GhostpawErrorCode;
  readonly hint?: string;

  constructor(code: GhostpawErrorCode, message: string, options?: GhostpawErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "GhostpawError";
    this.code = code;
    this.hint = options?.hint;
  }

  format(): string {
    let out = `[${this.code}] ${this.message}`;
    if (this.hint) {
      out += `\nHint: ${this.hint}`;
    }
    return out;
  }

  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      name: this.name,
      code: this.code,
      message: this.message,
    };
    if (this.hint !== undefined) {
      obj.hint = this.hint;
    }
    return obj;
  }
}

export class ConfigError extends GhostpawError {
  constructor(message: string, options?: GhostpawErrorOptions) {
    super("ERR_CONFIG", message, options);
    this.name = "ConfigError";
  }
}

export class DatabaseError extends GhostpawError {
  constructor(message: string, options?: GhostpawErrorOptions) {
    super("ERR_DATABASE", message, options);
    this.name = "DatabaseError";
  }
}

export class ToolError extends GhostpawError {
  readonly toolName: string;

  constructor(toolName: string, message: string, options?: GhostpawErrorOptions) {
    super("ERR_TOOL", message, options);
    this.name = "ToolError";
    this.toolName = toolName;
  }

  override format(): string {
    let out = `[${this.code}] Tool "${this.toolName}": ${this.message}`;
    if (this.hint) {
      out += `\nHint: ${this.hint}`;
    }
    return out;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), toolName: this.toolName };
  }
}

export class BudgetExceededError extends GhostpawError {
  readonly usage: number;
  readonly limit: number;

  constructor(usage: number, limit: number, options?: GhostpawErrorOptions) {
    super("ERR_BUDGET", `Token budget exceeded: ${usage} used of ${limit} allowed`, {
      ...options,
      hint: options?.hint ?? "Reduce session length or increase budget in config.",
    });
    this.name = "BudgetExceededError";
    this.usage = usage;
    this.limit = limit;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), usage: this.usage, limit: this.limit };
  }
}

export interface ProviderErrorOptions extends GhostpawErrorOptions {
  statusCode?: number;
}

export class ProviderError extends GhostpawError {
  readonly provider: string;
  readonly statusCode?: number;

  constructor(provider: string, message: string, options?: ProviderErrorOptions) {
    super("ERR_PROVIDER", message, options);
    this.name = "ProviderError";
    this.provider = provider;
    this.statusCode = options?.statusCode;
  }

  override format(): string {
    let out = `[${this.code}] Provider "${this.provider}": ${this.message}`;
    if (this.statusCode) {
      out += ` (HTTP ${this.statusCode})`;
    }
    if (this.hint) {
      out += `\nHint: ${this.hint}`;
    }
    return out;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), provider: this.provider, statusCode: this.statusCode };
  }
}

export class ValidationError extends GhostpawError {
  readonly field: string;
  readonly value: unknown;

  constructor(field: string, value: unknown, reason: string, options?: GhostpawErrorOptions) {
    super("ERR_VALIDATION", `Invalid "${field}": ${reason}`, options);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }

  override toJSON(): Record<string, unknown> {
    return { ...super.toJSON(), field: this.field };
  }
}
