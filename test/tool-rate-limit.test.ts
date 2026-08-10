import { describe, expect, it } from "vitest";
import { createToolRateLimiter, limitForTool } from "../src/util/tool-rate-limit.js";

describe("createToolRateLimiter", () => {
  it("allows unlimited calls when limit is zero", () => {
    const limiter = createToolRateLimiter({ defaultPerMinute: 0, quotePerMinute: 0 });
    for (let i = 0; i < 100; i++) {
      expect(limiter("sera.get_quote", 0).ok).toBe(true);
    }
  });

  it("blocks after the per-tool window is exhausted", () => {
    let now = 1_000;
    const limiter = createToolRateLimiter({ defaultPerMinute: 2, quotePerMinute: 1 }, () => now);

    expect(limiter("sera.limit_watcher", 2).ok).toBe(true);
    expect(limiter("sera.limit_watcher", 2).ok).toBe(true);

    const blocked = limiter("sera.limit_watcher", 2);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.limit).toBe(2);
      expect(blocked.windowSeconds).toBe(60);
      expect(blocked.retryAfterSeconds).toBe(60);
    }

    now += 60_000;
    expect(limiter("sera.limit_watcher", 2).ok).toBe(true);
  });

  it("tracks tools independently", () => {
    const limiter = createToolRateLimiter({ defaultPerMinute: 1, quotePerMinute: 1 }, () => 1_000);

    expect(limiter("sera.get_quote", 1).ok).toBe(true);
    expect(limiter("sera.get_quote", 1).ok).toBe(false);
    expect(limiter("sera.list_currencies", 1).ok).toBe(true);
  });
});

describe("limitForTool", () => {
  it("uses the quote limit for read-only non-idempotent tools", () => {
    expect(
      limitForTool(
        { annotations: { readOnly: true, idempotent: false } },
        { defaultPerMinute: 120, quotePerMinute: 30 },
      ),
    ).toBe(30);
  });

  it("falls back to the default limit when no quote override is configured", () => {
    expect(
      limitForTool(
        { annotations: { readOnly: true, idempotent: false } },
        { defaultPerMinute: 120, quotePerMinute: 0 },
      ),
    ).toBe(120);
  });

  it("uses the default limit for ordinary read tools", () => {
    expect(
      limitForTool(
        { annotations: { readOnly: true, idempotent: true } },
        { defaultPerMinute: 120, quotePerMinute: 30 },
      ),
    ).toBe(120);
  });
});
