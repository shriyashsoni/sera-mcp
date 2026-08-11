import type { ToolDef } from "../tools/registry.js";

export interface ToolRateLimitConfig {
  defaultPerMinute: number;
  quotePerMinute: number;
}

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number; limit: number; windowSeconds: number };

interface WindowState {
  startedAt: number;
  count: number;
}

const WINDOW_MS = 60_000;

export function limitForTool(t: Pick<ToolDef, "annotations">, cfg: ToolRateLimitConfig): number {
  if (t.annotations.readOnly && t.annotations.idempotent === false && cfg.quotePerMinute > 0) {
    return cfg.quotePerMinute;
  }
  return cfg.defaultPerMinute;
}

export function createToolRateLimiter(
  cfg: ToolRateLimitConfig,
  nowMs: () => number = () => Date.now(),
) {
  const windows = new Map<string, WindowState>();

  return function check(toolName: string, limit: number): RateLimitDecision {
    if (limit <= 0) return { ok: true };

    const now = nowMs();
    const current = windows.get(toolName);
    if (!current || now - current.startedAt >= WINDOW_MS) {
      windows.set(toolName, { startedAt: now, count: 1 });
      return { ok: true };
    }

    if (current.count < limit) {
      current.count++;
      return { ok: true };
    }

    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - current.startedAt)) / 1000)),
      limit,
      windowSeconds: WINDOW_MS / 1000,
    };
  };
}
